"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import type { Database } from "@/lib/supabase/database.types";

type ServiceArea = Database["public"]["Enums"]["service_area"];

function allowedAreasForRole(role: string): ServiceArea[] {
  if (role === "owner") return ["grooming", "veterinary"];
  if (role === "attendant") return ["grooming"];
  if (role === "veterinarian") return ["veterinary"];
  return [];
}

const toggleSchema = z.object({
  appointment_id: z.string().uuid(),
  step_id: z.string().uuid(),
  done: z.boolean(),
  notes: z.string().trim().max(500).optional(),
});

type Result = { ok: true } | { ok: false; error: string };

/**
 * Idempotente: cria ou atualiza a linha `checklists` (junção appointment+step).
 * done=true → seta completed_at + completed_by.
 * done=false → mantém row mas zera completed_at (preserva foto vinculada).
 */
export async function toggleChecklistStep(
  input: z.infer<typeof toggleSchema>,
): Promise<Result> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant", "veterinarian"])) {
    return { ok: false, error: "Sem permissão." };
  }
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  // Defense-in-depth: confirma area do appointment + role
  const allowed = allowedAreasForRole(membership.role);
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, calendar:calendars!inner(area)")
    .eq("id", parsed.data.appointment_id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!appt) return { ok: false, error: "Agendamento não encontrado." };
  const area = (appt.calendar as { area: ServiceArea } | null)?.area;
  if (!area || !allowed.includes(area)) {
    return { ok: false, error: "Sem permissão na área deste atendimento." };
  }

  // Confirma step pertence à mesma loja
  const { data: step } = await supabase
    .from("checklist_steps")
    .select("id")
    .eq("id", parsed.data.step_id)
    .eq("petshop_id", membership.petshopId)
    .eq("active", true)
    .maybeSingle();
  if (!step) return { ok: false, error: "Etapa inválida." };

  // Upsert manualmente (sem unique compound em checklists.appointment+step?)
  // initial_schema declarou unique (appointment_id, step_id). OK pra upsert.
  const completed_at = parsed.data.done ? new Date().toISOString() : null;
  const completed_by = parsed.data.done ? session.user.id : null;

  const { error } = await supabase
    .from("checklists")
    .upsert(
      {
        petshop_id: membership.petshopId,
        appointment_id: parsed.data.appointment_id,
        step_id: parsed.data.step_id,
        completed_at,
        completed_by,
        notes: parsed.data.notes ?? null,
      },
      { onConflict: "appointment_id,step_id" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/checklist");
  return { ok: true };
}

const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const PHOTO_MIME_RE = /^image\/(jpeg|png|webp)$/i;

/**
 * Upload de foto pra uma etapa específica. Garante que existe a row em
 * `checklists` (cria placeholder com completed_at=null se não existe), faz
 * upload pro bucket privado e registra em appointment_step_photos.
 *
 * FormData esperado: { appointment_id, step_id, file }.
 */
export async function uploadStepPhoto(formData: FormData): Promise<Result & { url?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant", "veterinarian"])) {
    return { ok: false, error: "Sem permissão." };
  }

  const appointment_id = String(formData.get("appointment_id") ?? "");
  const step_id = String(formData.get("step_id") ?? "");
  const file = formData.get("file");

  if (!appointment_id || !step_id || !(file instanceof File)) {
    return { ok: false, error: "Faltam dados." };
  }
  if (!PHOTO_MIME_RE.test(file.type)) {
    return { ok: false, error: "Use JPG, PNG ou WebP." };
  }
  if (file.size === 0) {
    return { ok: false, error: "Arquivo vazio." };
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return { ok: false, error: "Foto maior que 5MB." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Storage indisponível." };

  const allowed = allowedAreasForRole(membership.role);
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, calendar:calendars!inner(area)")
    .eq("id", appointment_id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!appt) return { ok: false, error: "Agendamento não encontrado." };
  const area = (appt.calendar as { area: ServiceArea } | null)?.area;
  if (!area || !allowed.includes(area)) {
    return { ok: false, error: "Sem permissão na área deste atendimento." };
  }

  // Garante a row em checklists pra ter checklist_id antes de insertar a foto.
  const { data: existing } = await supabase
    .from("checklists")
    .select("id")
    .eq("appointment_id", appointment_id)
    .eq("step_id", step_id)
    .maybeSingle();

  let checklistId = existing?.id;
  if (!checklistId) {
    const { data: inserted, error: insErr } = await supabase
      .from("checklists")
      .insert({
        petshop_id: membership.petshopId,
        appointment_id,
        step_id,
        completed_at: null,
      })
      .select("id")
      .single();
    if (insErr || !inserted) return { ok: false, error: insErr?.message ?? "Erro." };
    checklistId = inserted.id;
  }

  // Path: <petshop_id>/<appointment_id>/<random>.<ext>
  const extMatch = file.type.match(/^image\/(\w+)$/);
  const ext = extMatch?.[1] === "jpeg" ? "jpg" : (extMatch?.[1] ?? "jpg");
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const photoPath = `${membership.petshopId}/${appointment_id}/${random}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: upErr } = await admin.storage
    .from("appointment-photos")
    .upload(photoPath, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) return { ok: false, error: upErr.message };

  const { error: rowErr } = await supabase.from("appointment_step_photos").insert({
    checklist_id: checklistId,
    petshop_id: membership.petshopId,
    photo_path: photoPath,
    uploaded_by: session.user.id,
  });
  if (rowErr) {
    // Best-effort cleanup do arquivo se a row falhou.
    await admin.storage.from("appointment-photos").remove([photoPath]);
    return { ok: false, error: rowErr.message };
  }

  revalidatePath("/app/checklist");
  return { ok: true };
}

const photoIdSchema = z.object({ id: z.string().uuid() });

export async function deleteStepPhoto(input: { id: string }): Promise<Result> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant", "veterinarian"])) {
    return { ok: false, error: "Sem permissão." };
  }
  const parsed = photoIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ID inválido." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };
  const admin = createAdminClient();

  const { data: photo } = await supabase
    .from("appointment_step_photos")
    .select("id, photo_path, petshop_id")
    .eq("id", parsed.data.id)
    .eq("petshop_id", membership.petshopId)
    .maybeSingle();
  if (!photo) return { ok: false, error: "Foto não encontrada." };

  const { error: delRowErr } = await supabase
    .from("appointment_step_photos")
    .delete()
    .eq("id", parsed.data.id)
    .eq("petshop_id", membership.petshopId);
  if (delRowErr) return { ok: false, error: delRowErr.message };

  if (admin) {
    await admin.storage.from("appointment-photos").remove([photo.photo_path]);
  }

  revalidatePath("/app/checklist");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";

const veterinarianSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Nome obrigatório"),
  crmv: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  specialties: z.array(z.string().trim().min(1)).default([]),
  active: z.boolean(),
});

export type VetFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseSpecialties(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function saveVeterinarian(_prev: VetFormState, formData: FormData): Promise<VetFormState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode gerenciar veterinários." };
  }

  const raw = {
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    crmv: String(formData.get("crmv") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    specialties: parseSpecialties(String(formData.get("specialties") ?? "")),
    active: String(formData.get("active") ?? "true") === "true",
  };

  const parsed = veterinarianSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const payload = {
    petshop_id: membership.petshopId,
    name: parsed.data.name,
    crmv: parsed.data.crmv ?? null,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email || null,
    specialties: parsed.data.specialties,
    active: parsed.data.active,
  };

  if (parsed.data.id) {
    const { error } = await supabase
      .from("veterinarians")
      .update({ ...payload, updated_by: session.user.id })
      .eq("id", parsed.data.id)
      .eq("petshop_id", membership.petshopId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("veterinarians")
      .insert({ ...payload, created_by: session.user.id });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/app/veterinarios");
  return { ok: true };
}

export async function deleteVeterinarian(id: string): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode excluir veterinários." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("veterinarians")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: session.user.id,
    })
    .eq("id", id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/veterinarios");
  return { ok: true };
}

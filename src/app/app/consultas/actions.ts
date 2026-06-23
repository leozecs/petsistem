"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const entrySchema = z.object({
  pet_id: z.string().uuid(),
  title: z.string().trim().min(1, "Informe o título.").max(120),
  notes: z.string().trim().min(1, "Informe as observações.").max(6000),
});

export async function createPetClinicalEntry(input: z.infer<typeof entrySchema>) {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "veterinarian"])) return { ok: false as const, error: "Sem permissão." };
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: "Supabase indisponível." };

  const { data: pet } = await supabase.from("pets").select("id").eq("id", parsed.data.pet_id).eq("petshop_id", membership.petshopId).is("deleted_at", null).maybeSingle();
  if (!pet) return { ok: false as const, error: "Pet não encontrado nesta loja." };

  let veterinarianId: string | null = null;
  if (membership.role === "veterinarian") {
    const { data: vet } = await supabase.from("veterinarians").select("id").eq("petshop_id", membership.petshopId).eq("user_id", session.user.id).is("deleted_at", null).maybeSingle();
    veterinarianId = vet?.id ?? null;
  }

  const { data: created, error } = await supabase.from("pet_clinical_entries").insert({
    petshop_id: membership.petshopId,
    pet_id: parsed.data.pet_id,
    veterinarian_id: veterinarianId,
    title: parsed.data.title,
    notes: parsed.data.notes,
    created_by: session.user.id,
  }).select("id").single();
  if (error || !created) return { ok: false as const, error: error?.message ?? "Falha ao salvar." };

  await createAdminClient()?.from("audit_logs").insert({ petshop_id: membership.petshopId, actor_id: session.user.id, action: "pet_clinical_entry.created", entity_table: "pet_clinical_entries", entity_id: created.id, metadata: { pet_id: parsed.data.pet_id } });
  revalidatePath("/app/consultas");
  return { ok: true as const };
}

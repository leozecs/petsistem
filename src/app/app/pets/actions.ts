"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";

const petSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  client_id: z.string().uuid("Tutor obrigatório"),
  name: z.string().trim().min(1, "Nome obrigatório"),
  species: z.string().trim().min(1, "Espécie obrigatória"),
  breed: z.string().trim().optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  weight_kg: z
    .union([z.literal(""), z.coerce.number().positive("Peso inválido").max(200)])
    .optional(),
  age_label: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type PetFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function savePet(_prev: PetFormState, formData: FormData): Promise<PetFormState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) {
    return { ok: false, error: "Você não tem permissão para gerenciar pets." };
  }

  const sexRaw = String(formData.get("sex") ?? "");
  // Normalize Brazilian decimals: "1,5" -> "1.5", "1.234,5" -> "1234.5"
  const weightRawText = String(formData.get("weight_kg") ?? "").trim();
  const weightNormalized = weightRawText.includes(",")
    ? weightRawText.replace(/\./g, "").replace(",", ".")
    : weightRawText;
  const parsedWeight = weightNormalized === "" ? "" : Number(weightNormalized);

  const raw = {
    id: String(formData.get("id") ?? "") || undefined,
    client_id: String(formData.get("client_id") ?? ""),
    name: String(formData.get("name") ?? ""),
    species: String(formData.get("species") ?? ""),
    breed: String(formData.get("breed") ?? "") || undefined,
    sex: (sexRaw === "male" || sexRaw === "female" || sexRaw === "unknown") ? sexRaw : undefined,
    weight_kg: Number.isNaN(parsedWeight) ? "" : parsedWeight,
    age_label: String(formData.get("age_label") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  };

  const parsed = petSchema.safeParse(raw);
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

  // Defense-in-depth: confirm the client belongs to this petshop before binding
  // a pet to it. RLS guards reads of cross-tenant clients, but the FK alone does
  // not enforce tenant equality on writes.
  const { data: ownerClient, error: cliErr } = await supabase
    .from("clients")
    .select("id")
    .eq("id", parsed.data.client_id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null)
    .maybeSingle();
  if (cliErr) return { ok: false, error: cliErr.message };
  if (!ownerClient) return { ok: false, error: "Tutor não encontrado nesta loja." };

  const payload = {
    petshop_id: membership.petshopId,
    client_id: parsed.data.client_id,
    name: parsed.data.name,
    species: parsed.data.species,
    breed: parsed.data.breed ?? null,
    sex: parsed.data.sex ?? null,
    weight_kg: typeof parsed.data.weight_kg === "number" ? parsed.data.weight_kg : null,
    age_label: parsed.data.age_label ?? null,
    notes: parsed.data.notes ?? null,
  };

  if (parsed.data.id) {
    const { error } = await supabase
      .from("pets")
      .update({ ...payload, updated_by: session.user.id })
      .eq("id", parsed.data.id)
      .eq("petshop_id", membership.petshopId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { count, error: countError } = await supabase
      .from("pets")
      .select("id", { count: "exact", head: true })
      .eq("client_id", parsed.data.client_id)
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null);
    if (countError) return { ok: false, error: countError.message };
    if ((count ?? 0) >= 10) {
      return { ok: false, error: "Este tutor já atingiu o limite de 10 pets." };
    }

    const { error } = await supabase
      .from("pets")
      .insert({ ...payload, created_by: session.user.id });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/app/clientes");
  return { ok: true };
}

export async function deletePet(id: string): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) {
    return { ok: false, error: "Você não tem permissão para excluir pets." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("pets")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: session.user.id,
    })
    .eq("id", id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/clientes");
  return { ok: true };
}

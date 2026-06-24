"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createAdminClient } from "@/lib/supabase/admin";

const clientSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Nome obrigatório"),
  phone: z.string().trim().min(1, "Telefone obrigatório"),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type ClientFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const clientWithPetsSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(120),
  whatsapp: z.string().trim().min(8, "WhatsApp obrigatório").max(40),
  pets: z.array(z.object({
    name: z.string().trim().min(1, "Nome do pet obrigatório").max(120),
    breed: z.string().trim().min(1, "Raça obrigatória").max(120),
  })).max(5, "O cadastro inicial permite até 5 pets."),
});

export async function createClientWithPets(input: z.infer<typeof clientWithPetsSchema>): Promise<ClientFormState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) return { ok: false, error: "Sem permissão." };
  const parsed = clientWithPetsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { data: client, error: clientError } = await supabase.from("clients").insert({
    petshop_id: membership.petshopId,
    name: parsed.data.name,
    phone: parsed.data.whatsapp,
    whatsapp: parsed.data.whatsapp,
    created_by: session.user.id,
  }).select("id").single();
  if (clientError || !client) return { ok: false, error: clientError?.message ?? "Falha ao criar tutor." };

  if (parsed.data.pets.length > 0) {
    const { error: petsError } = await supabase.from("pets").insert(parsed.data.pets.map((pet) => ({
      petshop_id: membership.petshopId,
      client_id: client.id,
      name: pet.name,
      breed: pet.breed,
      species: "Não informado",
      created_by: session.user.id,
    })));
    if (petsError) {
      await supabase.from("clients").delete().eq("id", client.id).eq("petshop_id", membership.petshopId);
      return { ok: false, error: petsError.message };
    }
  }

  await createAdminClient()?.from("audit_logs").insert({ petshop_id: membership.petshopId, actor_id: session.user.id, action: "client.created_with_pets", entity_table: "clients", entity_id: client.id, metadata: { pet_count: parsed.data.pets.length } });
  revalidatePath("/app/clientes");
  return { ok: true };
}

export async function saveClient(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) {
    return { ok: false, error: "Você não tem permissão para gerenciar clientes." };
  }

  const raw = {
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    address: String(formData.get("address") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  };

  const parsed = clientSchema.safeParse(raw);
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
    phone: parsed.data.phone,
    whatsapp: parsed.data.whatsapp ?? null,
    email: parsed.data.email || null,
    address: parsed.data.address ?? null,
    notes: parsed.data.notes ?? null,
  };

  if (parsed.data.id) {
    const { error } = await supabase
      .from("clients")
      .update({ ...payload, updated_by: session.user.id })
      .eq("id", parsed.data.id)
      .eq("petshop_id", membership.petshopId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("clients")
      .insert({ ...payload, created_by: session.user.id });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/app/clientes");
  return { ok: true };
}

export async function deleteClient(id: string): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) {
    return { ok: false, error: "Você não tem permissão para excluir clientes." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const deletedAt = new Date().toISOString();

  // Cascade soft-delete: every active pet under this tutor gets the same
  // deleted_at timestamp. Pets are filtered by petshop_id and client_id so the
  // tenant boundary remains intact even if `id` somehow crossed it (RLS would
  // already prevent that — this is defense-in-depth).
  const { error: petsErr } = await supabase
    .from("pets")
    .update({
      deleted_at: deletedAt,
      deleted_by: session.user.id,
    })
    .eq("client_id", id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null);
  if (petsErr) return { ok: false, error: petsErr.message };

  const { error } = await supabase
    .from("clients")
    .update({
      deleted_at: deletedAt,
      deleted_by: session.user.id,
    })
    .eq("id", id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/clientes");
  return { ok: true };
}

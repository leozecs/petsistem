"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";

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

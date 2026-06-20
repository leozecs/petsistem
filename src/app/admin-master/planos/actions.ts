"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

export type ActionState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> };

async function requireAdminMaster() {
  const session = await getSession();
  if (!session || session.user.globalRole !== "admin_master") return null;
  return session.user;
}

const planSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Código muito curto")
    .max(40)
    .regex(/^[a-z0-9_-]+$/, "Use apenas letras minúsculas, números, _ e -"),
  name: z.string().trim().min(2, "Nome obrigatório").max(80),
  price_cents: z.coerce.number().int().min(0, "Valor inválido"),
  max_users: z.coerce.number().int().min(1).max(999),
  allows_veterinarian: z.boolean(),
  description: z.string().trim().max(500).optional(),
  active: z.boolean(),
});

export async function savePlan(formData: FormData): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };

  const raw = {
    id: String(formData.get("id") ?? "") || undefined,
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    price_cents: String(formData.get("price_cents") ?? "0"),
    max_users: String(formData.get("max_users") ?? "1"),
    allows_veterinarian: String(formData.get("allows_veterinarian") ?? "false") === "true",
    description: String(formData.get("description") ?? "") || undefined,
    active: String(formData.get("active") ?? "true") === "true",
  };

  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const payload = {
    code: parsed.data.code,
    name: parsed.data.name,
    price_cents: parsed.data.price_cents,
    max_users: parsed.data.max_users,
    allows_veterinarian: parsed.data.allows_veterinarian,
    description: parsed.data.description ?? null,
    active: parsed.data.active,
  };

  if (parsed.data.id) {
    const { error } = await admin
      .from("plans")
      .update({ ...payload, updated_by: me.id })
      .eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin
      .from("plans")
      .insert({ ...payload, created_by: me.id });
    if (error) {
      if (error.message.includes("duplicate")) {
        return { ok: false, fieldErrors: { code: "Esse código já existe." } };
      }
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/admin-master/planos");
  return { ok: true };
}

export async function deletePlan(id: string): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "ID inválido." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  // Soft-disable em vez de delete físico — preserva histórico em subscriptions
  // que referenciam o plano pelo nome.
  const { error } = await admin
    .from("plans")
    .update({ active: false, updated_by: me.id })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin-master/planos");
  return { ok: true };
}

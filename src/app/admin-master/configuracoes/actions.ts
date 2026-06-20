"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

export type ActionState = { ok: boolean; error?: string };

async function requireAdminMaster() {
  const session = await getSession();
  if (!session || session.user.globalRole !== "admin_master") return null;
  return session.user;
}

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Nome obrigatório").max(120),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z
    .union([z.literal(""), z.string().min(8, "Senha precisa de pelo menos 8 caracteres")])
    .optional(),
});

/**
 * Atualiza o perfil do Admin Master logado: nome, email e (opcionalmente)
 * senha. Mudanças de email e senha vão via Auth admin API. Atualiza `users`
 * em seguida pra manter consistência.
 */
export async function updateAdminProfile(formData: FormData): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };

  const parsed = profileSchema.safeParse({
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? "") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const authUpdate: { email?: string; password?: string } = {};
  if (parsed.data.email !== me.email) authUpdate.email = parsed.data.email;
  if (parsed.data.password) authUpdate.password = parsed.data.password;

  if (Object.keys(authUpdate).length > 0) {
    const { error: authErr } = await admin.auth.admin.updateUserById(me.id, authUpdate);
    if (authErr) {
      if (authErr.message.toLowerCase().includes("already")) {
        return { ok: false, error: "Esse email já está em uso por outro login." };
      }
      return { ok: false, error: authErr.message };
    }
  }

  const { error: profErr } = await admin
    .from("users")
    .update({
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      updated_by: me.id,
    })
    .eq("id", me.id);
  if (profErr) return { ok: false, error: profErr.message };

  revalidatePath("/admin-master/configuracoes");
  return { ok: true };
}

const pixSchema = z.object({
  pix_key: z.string().trim().max(200),
  pix_holder_name: z.string().trim().max(200),
});

/**
 * Atualiza chave Pix global da plataforma + nome do beneficiário.
 * Usada nas telas de Cobranças pra exibir pro dono pagar.
 */
export async function updatePlatformPix(formData: FormData): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };

  const parsed = pixSchema.safeParse({
    pix_key: String(formData.get("pix_key") ?? ""),
    pix_holder_name: String(formData.get("pix_holder_name") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { error } = await admin
    .from("platform_settings")
    .update({
      pix_key: parsed.data.pix_key || null,
      pix_holder_name: parsed.data.pix_holder_name || null,
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) {
    if (error.message.includes("platform_settings")) {
      return { ok: false, error: "Tabela platform_settings não existe ainda. Aplique a migration 20260620200000." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin-master/configuracoes");
  revalidatePath("/admin-master/cobrancas");
  return { ok: true };
}

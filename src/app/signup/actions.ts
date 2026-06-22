"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  consumePublicRateLimit,
  getPublicClientIdentifier,
} from "@/lib/security/public-rate-limit";
import { isReservedSubdomain } from "@/lib/subdomains";

export type SignupResult =
  | { ok: true; email: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const signupSchema = z
  .object({
    shop_name: z.string().trim().min(2, "Nome da loja muito curto").max(120),
    owner_name: z.string().trim().min(2, "Seu nome muito curto").max(120),
    whatsapp: z.string().trim().min(8, "WhatsApp inválido").max(40),
    email: z.string().trim().toLowerCase().email("Email inválido"),
    password: z.string().min(8, "Senha precisa de pelo menos 8 caracteres").max(72),
    confirm: z.string().min(8, "Confirme a senha"),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas não conferem",
  });

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/**
 * Gera um subdomínio único a partir do nome da loja. Se houver conflito, tenta
 * adicionar sufixo numérico até achar um livre. Limite de 50 tentativas pra
 * evitar loop infinito.
 */
async function pickUniqueSubdomain(
  admin: ReturnType<typeof createAdminClient>,
  base: string,
): Promise<string | null> {
  if (!admin) return null;
  const slug = slugify(base) || "loja";
  if (isReservedSubdomain(slug)) return await pickUniqueSubdomain(admin, slug + "-pet");

  const candidates = [slug, ...Array.from({ length: 50 }, (_, i) => `${slug}-${i + 2}`)];
  for (const cand of candidates) {
    if (isReservedSubdomain(cand)) continue;
    const { data: existing } = await admin
      .from("petshops")
      .select("id")
      .or(`subdomain.eq.${cand},slug.eq.${cand}`)
      .is("deleted_at", null)
      .maybeSingle();
    if (!existing) return cand;
  }
  return null;
}

/**
 * Self-signup público: cria loja em modo trial (7 dias) + login do dono que
 * precisa confirmar email antes de poder entrar. Sem auth — qualquer um da
 * internet pode chamar.
 *
 * Rollback best-effort: se algum passo após createUser falha, deleta o auth
 * user pra liberar o email pra retry.
 */
export async function signupTenant(formData: FormData): Promise<SignupResult> {
  const parsed = signupSchema.safeParse({
    shop_name: String(formData.get("shop_name") ?? ""),
    owner_name: String(formData.get("owner_name") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Dados inválidos.", fieldErrors };
  }

  const clientIdentifier = await getPublicClientIdentifier();
  const [clientLimit, emailLimit] = await Promise.all([
    consumePublicRateLimit({
      action: "tenant_signup_client",
      identifier: clientIdentifier,
      limit: 5,
      windowSeconds: 60 * 60,
    }),
    consumePublicRateLimit({
      action: "tenant_signup_email",
      identifier: parsed.data.email,
      limit: 3,
      windowSeconds: 60 * 60,
    }),
  ]);
  if (!clientLimit.allowed || !emailLimit.allowed) {
    const wasLimited =
      (!clientLimit.allowed && clientLimit.reason === "limited") ||
      (!emailLimit.allowed && emailLimit.reason === "limited");
    return {
      ok: false,
      error: wasLimited
        ? "Muitos cadastros. Aguarde uma hora e tente novamente."
        : "Proteção antiabuso indisponível. Tente novamente em alguns minutos.",
    };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Servidor indisponível, tente novamente." };

  // 1) Resolver subdomain
  const subdomain = await pickUniqueSubdomain(admin, parsed.data.shop_name);
  if (!subdomain) {
    return {
      ok: false,
      error: "Não conseguimos gerar um subdomínio livre. Tente um nome diferente.",
    };
  }

  // 2) Buscar plano Profissional pra vincular durante o trial
  const { data: trialPlan } = await admin
    .from("plans")
    .select("id, name, price_cents")
    .eq("code", "profissional")
    .eq("active", true)
    .maybeSingle();
  // Tolerante: se não achar Profissional, usa qualquer plano ativo
  let plan = trialPlan;
  if (!plan) {
    const { data: any } = await admin
      .from("plans")
      .select("id, name, price_cents")
      .eq("active", true)
      .order("price_cents")
      .limit(1)
      .maybeSingle();
    plan = any ?? null;
  }
  if (!plan) {
    return { ok: false, error: "Sem planos disponíveis. Contate o suporte." };
  }

  // 3) Cria Auth user. email_confirm: false → Supabase manda email de confirmação
  //    e bloqueia login até clicar no link.
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: false,
    user_metadata: { full_name: parsed.data.owner_name },
  });
  if (authErr || !authData.user) {
    if (authErr?.message?.toLowerCase().includes("already")) {
      return {
        ok: false,
        fieldErrors: {
          email: "Já existe um cadastro com esse email. Tente entrar ou usar outro.",
        },
        error: "Email já cadastrado.",
      };
    }
    return { ok: false, error: authErr?.message ?? "Falha ao criar conta." };
  }
  const ownerId = authData.user.id;
  const rollbackAuth = async () => {
    try {
      await admin.auth.admin.deleteUser(ownerId);
    } catch {
      /* best-effort */
    }
  };

  // 4) users profile
  const { error: profErr } = await admin.from("users").insert({
    id: ownerId,
    email: parsed.data.email,
    full_name: parsed.data.owner_name,
    phone: parsed.data.whatsapp,
    global_role: "user",
  });
  if (profErr && !profErr.message.includes("duplicate")) {
    await rollbackAuth();
    return { ok: false, error: profErr.message };
  }

  // 5) petshop em trial
  const { data: petshop, error: shopErr } = await admin
    .from("petshops")
    .insert({
      name: parsed.data.shop_name,
      slug: subdomain,
      subdomain,
      status: "trial",
      plan_id: plan.id,
      plan_name: plan.name,
      whatsapp: parsed.data.whatsapp,
      primary_color: "#0b0b0c",
      settings: {},
      created_by: ownerId,
    })
    .select("id")
    .single();
  if (shopErr || !petshop) {
    await rollbackAuth();
    return { ok: false, error: shopErr?.message ?? "Falha ao criar loja." };
  }

  // 6) membership owner
  const { error: memErr } = await admin.from("memberships").insert({
    petshop_id: petshop.id,
    user_id: ownerId,
    role: "owner",
    status: "active",
    created_by: ownerId,
  });
  if (memErr) {
    await admin.from("petshops").delete().eq("id", petshop.id);
    await rollbackAuth();
    return { ok: false, error: memErr.message };
  }

  // 7) Calendários default
  await admin.from("calendars").insert([
    {
      petshop_id: petshop.id,
      area: "grooming",
      name: "Banho e Tosa",
      active: true,
      created_by: ownerId,
    },
    {
      petshop_id: petshop.id,
      area: "veterinary",
      name: "Veterinária",
      active: true,
      created_by: ownerId,
    },
  ]);

  // 8) Subscription trial — valor 0, vencimento 7 dias.
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);
  await admin.from("subscriptions").insert({
    petshop_id: petshop.id,
    plan_name: plan.name,
    amount_cents: 0,
    due_date: trialEnd.toISOString().slice(0, 10),
    status: "pending",
    pix_key: null,
    created_by: ownerId,
  });

  return { ok: true, email: parsed.data.email };
}

/**
 * Reenviar email de confirmação. Útil quando o tutor não recebeu ou clicou
 * num link expirado. Aceita só o email; sem auth.
 */
export async function resendConfirmation(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(email);
  if (!parsed.success) return { ok: false, error: "Email inválido." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Servidor indisponível." };

  // supabase.auth.resend reencaminha o email de confirmação sem precisar da senha.
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
  });
  if (error) {
    if (error.message?.toLowerCase().includes("already")) {
      return { ok: false, error: "Esse email já foi confirmado. Pode tentar entrar." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

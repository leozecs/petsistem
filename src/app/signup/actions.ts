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
  | {
      ok: true;
      email: string;
      mode: "trial" | "paid";
      shopName: string;
      planName: string;
      amountCents: number;
      billing: "monthly" | "annual";
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const OFFICIAL_PIX_KEY = "11972871616";

const PAID_PLAN_AMOUNTS: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 4_999, annual: 54_000 },
  profissional: { monthly: 9_999, annual: 108_000 },
  professional: { monthly: 9_999, annual: 108_000 },
  premium: { monthly: 13_999, annual: 151_200 },
};

const signupSchema = z
  .object({
    shop_name: z.string().trim().min(2, "Nome da loja muito curto").max(120),
    owner_name: z.string().trim().min(2, "Seu nome muito curto").max(120),
    whatsapp: z.string().trim().min(8, "WhatsApp invalido").max(40),
    email: z.string().trim().toLowerCase().email("Email invalido"),
    password: z.string().min(8, "Senha precisa de pelo menos 8 caracteres").max(72),
    confirm: z.string().min(8, "Confirme a senha"),
    mode: z.enum(["trial", "paid"]).default("trial"),
    plan: z.string().trim().toLowerCase().max(40).optional(),
    billing: z.enum(["monthly", "annual"]).default("monthly"),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas nao conferem",
  });

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

async function pickUniqueSubdomain(
  admin: ReturnType<typeof createAdminClient>,
  base: string,
): Promise<string | null> {
  if (!admin) return null;
  const slug = slugify(base) || "loja";
  if (isReservedSubdomain(slug)) return await pickUniqueSubdomain(admin, `${slug}-pet`);

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

async function insertDefaultCalendars(
  admin: ReturnType<typeof createAdminClient>,
  petshopId: string,
  ownerId: string,
) {
  return admin?.from("calendars").insert([
    {
      petshop_id: petshopId,
      area: "grooming",
      name: "Banho e Tosa",
      active: true,
      created_by: ownerId,
    },
    {
      petshop_id: petshopId,
      area: "veterinary",
      name: "Veterinaria",
      active: true,
      created_by: ownerId,
    },
  ]);
}

export async function signupTenant(formData: FormData): Promise<SignupResult> {
  const parsed = signupSchema.safeParse({
    shop_name: String(formData.get("shop_name") ?? ""),
    owner_name: String(formData.get("owner_name") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
    mode: String(formData.get("mode") ?? "trial") === "paid" ? "paid" : "trial",
    plan: String(formData.get("plan") ?? ""),
    billing: String(formData.get("billing") ?? "monthly") === "annual" ? "annual" : "monthly",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Dados invalidos.", fieldErrors };
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
        : "Protecao antiabuso indisponivel. Tente novamente em alguns minutos.",
    };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Servidor indisponivel, tente novamente." };

  const subdomain = await pickUniqueSubdomain(admin, parsed.data.shop_name);
  if (!subdomain) {
    return {
      ok: false,
      error: "Nao conseguimos gerar um subdominio livre. Tente um nome diferente.",
    };
  }

  const requestedPlanCode =
    parsed.data.mode === "paid" && parsed.data.plan
      ? parsed.data.plan
      : "profissional";
  const { data: requestedPlan } = await admin
    .from("plans")
    .select("id, name, price_cents")
    .eq("code", requestedPlanCode)
    .eq("active", true)
    .maybeSingle();
  let plan = requestedPlan;
  if (!plan) {
    const { data: fallbackPlan } = await admin
      .from("plans")
      .select("id, name, price_cents")
      .eq("active", true)
      .order("price_cents")
      .limit(1)
      .maybeSingle();
    plan = fallbackPlan ?? null;
  }
  if (!plan) return { ok: false, error: "Sem planos disponiveis. Contate o suporte." };

  const normalizedPlanCode =
    requestedPlanCode === "professional" ? "profissional" : requestedPlanCode;
  const paidAmountCents =
    PAID_PLAN_AMOUNTS[normalizedPlanCode]?.[parsed.data.billing] ??
    (parsed.data.billing === "annual"
      ? Math.round(plan.price_cents * 12 * 0.9)
      : plan.price_cents);

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
          email: "Ja existe um cadastro com esse email. Tente entrar ou usar outro.",
        },
        error: "Email ja cadastrado.",
      };
    }
    return { ok: false, error: authErr?.message ?? "Falha ao criar conta." };
  }

  const ownerId = authData.user.id;
  const rollbackAuth = async () => {
    try {
      await admin.auth.admin.deleteUser(ownerId);
    } catch {
      // best-effort
    }
  };

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

  const paidSignup = parsed.data.mode === "paid";
  const { data: petshop, error: shopErr } = await admin
    .from("petshops")
    .insert({
      name: parsed.data.shop_name,
      slug: subdomain,
      subdomain,
      status: paidSignup ? "blocked" : "trial",
      billing_blocked_at: paidSignup ? new Date().toISOString() : null,
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

  const calendarResult = await insertDefaultCalendars(admin, petshop.id, ownerId);
  if (calendarResult?.error) {
    await admin.from("petshops").delete().eq("id", petshop.id);
    await rollbackAuth();
    return { ok: false, error: calendarResult.error.message };
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (paidSignup ? 1 : 7));
  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .insert({
      petshop_id: petshop.id,
      plan_name: plan.name,
      amount_cents: paidSignup ? paidAmountCents : 0,
      due_date: dueDate.toISOString().slice(0, 10),
      status: paidSignup ? "confirming" : "pending",
      pix_key: paidSignup ? OFFICIAL_PIX_KEY : null,
      billing_cycle: parsed.data.billing,
      created_by: ownerId,
    })
    .select("id")
    .single();
  if (subscriptionError || !subscription) {
    await admin.from("petshops").delete().eq("id", petshop.id);
    await rollbackAuth();
    return {
      ok: false,
      error: subscriptionError?.message ?? "Falha ao criar assinatura.",
    };
  }

  if (paidSignup) {
    const { error: paymentError } = await admin.from("payments").insert({
      petshop_id: petshop.id,
      subscription_id: subscription.id,
      amount_cents: paidAmountCents,
      status: "confirming",
      billing_cycle: parsed.data.billing,
      created_by: ownerId,
    });
    if (paymentError) {
      await admin.from("petshops").delete().eq("id", petshop.id);
      await rollbackAuth();
      return { ok: false, error: paymentError.message };
    }
    await admin.from("audit_logs").insert({
      petshop_id: petshop.id,
      actor_id: ownerId,
      action: "billing.signup_payment_requested",
      entity_table: "subscriptions",
      entity_id: subscription.id,
      metadata: {
        amount_cents: paidAmountCents,
        plan_name: plan.name,
        billing: parsed.data.billing,
      },
    });
  }

  return {
    ok: true,
    email: parsed.data.email,
    mode: parsed.data.mode,
    shopName: parsed.data.shop_name,
    planName: plan.name,
    amountCents: paidSignup ? paidAmountCents : 0,
    billing: parsed.data.billing,
  };
}

export async function resendConfirmation(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(email);
  if (!parsed.success) return { ok: false, error: "Email invalido." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Servidor indisponivel." };

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
  });
  if (error) {
    if (error.message?.toLowerCase().includes("already")) {
      return { ok: false, error: "Esse email ja foi confirmado. Pode tentar entrar." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

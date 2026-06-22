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

const generateSchema = z.object({
  subscriptionId: z.string().uuid(),
});

/**
 * Gera uma cobrança Pix (payments row) pra uma subscription. O valor é copiado
 * da subscription; o admin então mostra a chave Pix global pro dono pagar. Não
 * integra com PSP — o status fica `pending` até o admin confirmar via
 * markPaymentPaid.
 */
export async function generatePayment(
  subscriptionId: string,
): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  const parsed = generateSchema.safeParse({ subscriptionId });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, petshop_id, amount_cents, status")
    .eq("id", parsed.data.subscriptionId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Assinatura não encontrada." };

  // Idempotência leve: não cria nova cobrança se já existir uma pendente.
  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("subscription_id", sub.id)
    .in("status", ["pending", "confirming"])
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "Já existe uma cobrança pendente pra esta assinatura." };
  }

  const { error } = await admin.from("payments").insert({
    subscription_id: sub.id,
    petshop_id: sub.petshop_id,
    amount_cents: sub.amount_cents,
    status: "pending",
    created_by: me.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin-master/cobrancas");
  revalidatePath("/admin-master/assinaturas");
  return { ok: true };
}

const markSchema = z.object({
  paymentId: z.string().uuid(),
});

export async function markPaymentPaid(
  paymentId: string,
): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  const parsed = markSchema.safeParse({ paymentId });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { error: payErr } = await admin.rpc("confirm_payment", {
    p_payment_id: parsed.data.paymentId,
    p_actor_id: me.id,
  });
  if (payErr) return { ok: false, error: payErr.message };

  // Cascading: subscription também vai pra "paid"
  revalidatePath("/admin-master/cobrancas");
  revalidatePath("/admin-master/assinaturas");
  return { ok: true };
}

export async function markPaymentUnpaid(
  paymentId: string,
): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  const parsed = markSchema.safeParse({ paymentId });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .update({
      status: "pending",
      paid_at: null,
      confirmed_by: null,
      updated_by: me.id,
    })
    .eq("id", parsed.data.paymentId)
    .select("subscription_id")
    .single();
  if (payErr) return { ok: false, error: payErr.message };

  if (payment?.subscription_id) {
    await admin
      .from("subscriptions")
      .update({ status: "pending", updated_by: me.id })
      .eq("id", payment.subscription_id);
  }

  revalidatePath("/admin-master/cobrancas");
  revalidatePath("/admin-master/assinaturas");
  return { ok: true };
}

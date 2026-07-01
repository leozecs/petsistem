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

// ---------------------------------------------------------------------------
// TROCAR PLANO DA LOJA
// ---------------------------------------------------------------------------

const changePlanSchema = z.object({
  petshopId: z.string().uuid(),
  planId: z.string().uuid(),
});

export async function changePetshopPlan(
  petshopId: string,
  planId: string,
): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  const parsed = changePlanSchema.safeParse({ petshopId, planId });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { data: plan } = await admin
    .from("plans")
    .select("id, name, price_cents")
    .eq("id", parsed.data.planId)
    .maybeSingle();
  if (!plan) return { ok: false, error: "Plano não encontrado." };

  const { error } = await admin
    .from("petshops")
    .update({
      plan_id: plan.id,
      plan_name: plan.name,
      updated_by: me.id,
    })
    .eq("id", parsed.data.petshopId);
  if (error) return { ok: false, error: error.message };

  const { data: latestSub } = await admin
    .from("subscriptions")
    .select("id, status")
    .eq("petshop_id", parsed.data.petshopId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestSub && latestSub.status !== "paid") {
    const { error: subError } = await admin
      .from("subscriptions")
      .update({
        plan_name: plan.name,
        amount_cents: plan.price_cents,
        updated_by: me.id,
      })
      .eq("id", latestSub.id);
    if (subError) return { ok: false, error: subError.message };
  }

  revalidatePath("/admin-master/assinaturas");
  revalidatePath("/admin-master/lojas");
  revalidatePath("/admin-master/cobrancas");
  revalidatePath("/admin-master", "layout");
  revalidatePath("/app", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// RENOVAR ASSINATURA (cria próximo ciclo)
// ---------------------------------------------------------------------------

const renewSchema = z.object({
  petshopId: z.string().uuid(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

/**
 * Cria uma nova subscription pra loja, gerando o ciclo seguinte. Valor e nome
 * do plano vêm do petshops.plan_id atual. A subscription anterior, se houver,
 * é marcada como "paid" se ainda estava aberta — assumimos que admin só renova
 * depois de confirmar pagamento.
 */
export async function renewSubscription(
  petshopId: string,
  dueDate: string,
): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  const parsed = renewSchema.safeParse({ petshopId, dueDate });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { data: petshop } = await admin
    .from("petshops")
    .select("id, plan_id, plan_name, pix_key")
    .eq("id", parsed.data.petshopId)
    .maybeSingle();
  if (!petshop) return { ok: false, error: "Loja não encontrada." };
  if (!petshop.plan_id) {
    return { ok: false, error: "Defina um plano para a loja antes de renovar." };
  }

  const { data: plan } = await admin
    .from("plans")
    .select("name, price_cents")
    .eq("id", petshop.plan_id)
    .maybeSingle();
  if (!plan) return { ok: false, error: "Plano vinculado não existe mais." };

  const { error } = await admin.from("subscriptions").insert({
    petshop_id: petshop.id,
    plan_name: plan.name,
    amount_cents: plan.price_cents,
    due_date: parsed.data.dueDate,
    status: "pending",
    pix_key: petshop.pix_key,
    created_by: me.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin-master/assinaturas");
  revalidatePath("/admin-master/cobrancas");
  revalidatePath("/app/assinatura");
  revalidatePath("/app", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// MARCAR ASSINATURA COMO PAGA (sem registrar payment row, atalho rápido)
// ---------------------------------------------------------------------------

export async function markSubscriptionPaid(
  subscriptionId: string,
): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  if (!z.string().uuid().safeParse(subscriptionId).success) {
    return { ok: false, error: "ID inválido." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { error } = await admin.rpc("confirm_subscription_payment", {
    p_subscription_id: subscriptionId,
    p_actor_id: me.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin-master/assinaturas");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// MARCAR PAGO COM VALOR — cria/atualiza payment com valor editado e ciclo.
// Chamado pelo botão "Marcar pago" na aba unificada de Assinaturas.
// ---------------------------------------------------------------------------

const markPaidWithAmountSchema = z.object({
  subscriptionId: z.string().uuid(),
  amountCents: z.number().int().min(1).max(10_000_000),
  billingCycle: z.enum(["monthly", "annual"]),
});

export async function markSubscriptionPaidWithAmount(
  input: {
    subscriptionId: string;
    amountCents: number;
    billingCycle: "monthly" | "annual";
  },
): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  const parsed = markPaidWithAmountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, petshop_id, amount_cents, status")
    .eq("id", parsed.data.subscriptionId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Assinatura não encontrada." };

  // Atualiza subscription com valor + ciclo
  await admin
    .from("subscriptions")
    .update({
      amount_cents: parsed.data.amountCents,
      billing_cycle: parsed.data.billingCycle,
      status: "paid",
      updated_by: me.id,
    })
    .eq("id", sub.id);

  // Cria (ou atualiza) o payment. Se já existe pending, atualiza; senão insere.
  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("subscription_id", sub.id)
    .in("status", ["pending", "confirming"])
    .is("deleted_at", null)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  if (existing) {
    await admin
      .from("payments")
      .update({
        amount_cents: parsed.data.amountCents,
        billing_cycle: parsed.data.billingCycle,
        status: "paid",
        paid_at: nowIso,
        confirmed_by: me.id,
        updated_by: me.id,
      })
      .eq("id", existing.id);
  } else {
    await admin.from("payments").insert({
      subscription_id: sub.id,
      petshop_id: sub.petshop_id,
      amount_cents: parsed.data.amountCents,
      billing_cycle: parsed.data.billingCycle,
      status: "paid",
      paid_at: nowIso,
      confirmed_by: me.id,
      created_by: me.id,
    });
  }

  await admin.from("audit_logs").insert({
    petshop_id: sub.petshop_id,
    actor_id: me.id,
    action: "billing.payment_marked_paid_with_amount",
    entity_table: "subscriptions",
    entity_id: sub.id,
    metadata: {
      amount_cents: parsed.data.amountCents,
      billing_cycle: parsed.data.billingCycle,
    },
  });

  revalidatePath("/admin-master/assinaturas");
  revalidatePath("/admin-master");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// ATIVAR LOJA BLOQUEADA + REGISTRAR PAGAMENTO
// Fluxo Leonardo: cliente pagou → admin verifica → clica "Liberar login" →
// modal pergunta quanto foi pago + ciclo → grava payment=paid e reativa a loja.
// ---------------------------------------------------------------------------

const activateAndPaySchema = z.object({
  petshopId: z.string().uuid(),
  amountCents: z.number().int().min(1).max(10_000_000),
  billingCycle: z.enum(["monthly", "annual"]),
});

export async function activateAndRecordPayment(
  input: {
    petshopId: string;
    amountCents: number;
    billingCycle: "monthly" | "annual";
  },
): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  const parsed = activateAndPaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { data: shop } = await admin
    .from("petshops")
    .select("id, status, plan_name")
    .eq("id", parsed.data.petshopId)
    .maybeSingle();
  if (!shop) return { ok: false, error: "Loja não encontrada." };

  // Ativa a loja
  await admin
    .from("petshops")
    .update({
      status: "active",
      billing_blocked_at: null,
      updated_by: me.id,
    })
    .eq("id", shop.id);

  // Reativa memberships bloqueadas
  await admin
    .from("memberships")
    .update({ status: "active", updated_by: me.id })
    .eq("petshop_id", shop.id)
    .eq("status", "blocked");

  // Marca subscription mais recente como paga com valor + ciclo
  const { data: latestSub } = await admin
    .from("subscriptions")
    .select("id")
    .eq("petshop_id", shop.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  if (latestSub) {
    await admin
      .from("subscriptions")
      .update({
        amount_cents: parsed.data.amountCents,
        billing_cycle: parsed.data.billingCycle,
        status: "paid",
        updated_by: me.id,
      })
      .eq("id", latestSub.id);

    const { data: existingPay } = await admin
      .from("payments")
      .select("id")
      .eq("subscription_id", latestSub.id)
      .in("status", ["pending", "confirming"])
      .is("deleted_at", null)
      .maybeSingle();

    if (existingPay) {
      await admin
        .from("payments")
        .update({
          amount_cents: parsed.data.amountCents,
          billing_cycle: parsed.data.billingCycle,
          status: "paid",
          paid_at: nowIso,
          confirmed_by: me.id,
          updated_by: me.id,
        })
        .eq("id", existingPay.id);
    } else {
      await admin.from("payments").insert({
        subscription_id: latestSub.id,
        petshop_id: shop.id,
        amount_cents: parsed.data.amountCents,
        billing_cycle: parsed.data.billingCycle,
        status: "paid",
        paid_at: nowIso,
        confirmed_by: me.id,
        created_by: me.id,
      });
    }
  } else {
    // Sem subscription — cria uma já paga (edge case).
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const { data: newSub } = await admin
      .from("subscriptions")
      .insert({
        petshop_id: shop.id,
        plan_name: shop.plan_name ?? "Ativação manual",
        amount_cents: parsed.data.amountCents,
        billing_cycle: parsed.data.billingCycle,
        due_date: dueDate.toISOString().slice(0, 10),
        status: "paid",
        created_by: me.id,
      })
      .select("id")
      .single();
    if (newSub) {
      await admin.from("payments").insert({
        subscription_id: newSub.id,
        petshop_id: shop.id,
        amount_cents: parsed.data.amountCents,
        billing_cycle: parsed.data.billingCycle,
        status: "paid",
        paid_at: nowIso,
        confirmed_by: me.id,
        created_by: me.id,
      });
    }
  }

  await admin.from("audit_logs").insert({
    petshop_id: shop.id,
    actor_id: me.id,
    action: "petshop.activated_after_payment",
    entity_table: "petshops",
    entity_id: shop.id,
    metadata: {
      amount_cents: parsed.data.amountCents,
      billing_cycle: parsed.data.billingCycle,
      previous_status: shop.status,
    },
  });

  revalidatePath("/admin-master/assinaturas");
  revalidatePath("/admin-master");
  revalidatePath("/admin-master/lojas");
  return { ok: true };
}

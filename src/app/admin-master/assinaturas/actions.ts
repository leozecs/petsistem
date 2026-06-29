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
  revalidatePath("/admin-master/cobrancas");
  return { ok: true };
}

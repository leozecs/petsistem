"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createAdminClient } from "@/lib/supabase/admin";

export async function reportSubscriptionPaid(subscriptionId: string) {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false as const, error: "Apenas o dono pode informar pagamento." };
  }
  if (!z.string().uuid().safeParse(subscriptionId).success) {
    return { ok: false as const, error: "Assinatura inválida." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false as const, error: "Serviço indisponível." };

  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("id, petshop_id, amount_cents, status")
    .eq("id", subscriptionId)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null)
    .maybeSingle();
  if (subscriptionError) return { ok: false as const, error: subscriptionError.message };
  if (!subscription) return { ok: false as const, error: "Assinatura não encontrada." };
  if (subscription.status === "paid") {
    return { ok: false as const, error: "Assinatura já está paga." };
  }

  const { data: payment, error: paymentLookupError } = await admin
    .from("payments")
    .select("id")
    .eq("subscription_id", subscription.id)
    .eq("petshop_id", membership.petshopId)
    .in("status", ["pending", "overdue", "confirming"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (paymentLookupError) return { ok: false as const, error: paymentLookupError.message };

  let paymentId = payment?.id;
  if (paymentId) {
    const { error } = await admin
      .from("payments")
      .update({ status: "confirming", updated_by: session.user.id })
      .eq("id", paymentId)
      .eq("petshop_id", membership.petshopId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { data: created, error } = await admin
      .from("payments")
      .insert({
        subscription_id: subscription.id,
        petshop_id: membership.petshopId,
        amount_cents: subscription.amount_cents,
        status: "confirming",
        created_by: session.user.id,
      })
      .select("id")
      .single();
    if (error || !created) {
      return { ok: false as const, error: error?.message ?? "Falha ao informar pagamento." };
    }
    paymentId = created.id;
  }

  const { error: statusError } = await admin
    .from("subscriptions")
    .update({ status: "confirming", updated_by: session.user.id })
    .eq("id", subscription.id)
    .eq("petshop_id", membership.petshopId);
  if (statusError) return { ok: false as const, error: statusError.message };

  const { data: admins } = await admin
    .from("users")
    .select("id")
    .eq("global_role", "admin_master")
    .is("deleted_at", null);
  if ((admins ?? []).length > 0) {
    await admin.from("notifications").insert(
      (admins ?? []).map((user) => ({
        user_id: user.id,
        petshop_id: membership.petshopId,
        kind: "subscription_due" as const,
        title: `${membership.petshop.name} informou pagamento`,
        body: "Valide manualmente a cobrança no Admin Master.",
        link: "/admin-master/cobrancas",
      })),
    );
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    petshop_id: membership.petshopId,
    actor_id: session.user.id,
    action: "billing.payment_reported",
    entity_table: "payments",
    entity_id: paymentId,
    metadata: { subscription_id: subscription.id },
  });
  if (auditError) return { ok: false as const, error: auditError.message };

  revalidatePath("/app/assinatura");
  revalidatePath("/admin-master/cobrancas");
  return { ok: true as const };
}

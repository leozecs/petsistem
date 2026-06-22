import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Bloqueia diariamente lojas cujo trial gratuito venceu.
 *
 * O trial é identificado pela assinatura pendente de valor zero criada no
 * cadastro público. A loja só é alterada se ainda estiver com status `trial`,
 * preservando qualquer ativação ou bloqueio manual feito pelo Admin Master.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return new NextResponse(null, { status: 404 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return new NextResponse(null, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Service role indisponível." },
      { status: 500 },
    );
  }

  const trialCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: expiredSubscriptions, error: subscriptionsError } = await admin
    .from("subscriptions")
    .select("id, petshop_id, due_date, created_at")
    .eq("status", "pending")
    .eq("amount_cents", 0)
    .lte("created_at", trialCutoff);

  if (subscriptionsError) {
    return NextResponse.json(
      { ok: false, error: subscriptionsError.message },
      { status: 500 },
    );
  }

  const subscriptionByPetshop = new Map(
    (expiredSubscriptions ?? []).map((subscription) => [
      subscription.petshop_id,
      subscription,
    ]),
  );
  const petshopIds = [...subscriptionByPetshop.keys()];
  if (petshopIds.length === 0) {
    return NextResponse.json({ ok: true, blocked: 0 });
  }

  const { data: blockedPetshops, error: blockError } = await admin
    .from("petshops")
    .update({ status: "blocked" })
    .in("id", petshopIds)
    .eq("status", "trial")
    .is("deleted_at", null)
    .select("id");

  if (blockError) {
    return NextResponse.json(
      { ok: false, error: blockError.message },
      { status: 500 },
    );
  }

  const blockedIds = (blockedPetshops ?? []).map((petshop) => petshop.id);
  if (blockedIds.length === 0) {
    return NextResponse.json({ ok: true, blocked: 0 });
  }

  const subscriptionIds = blockedIds
    .map((petshopId) => subscriptionByPetshop.get(petshopId)?.id)
    .filter((id): id is string => Boolean(id));

  const { error: overdueError } = await admin
    .from("subscriptions")
    .update({ status: "overdue" })
    .in("id", subscriptionIds)
    .eq("status", "pending");

  if (overdueError) {
    return NextResponse.json(
      { ok: false, error: overdueError.message },
      { status: 500 },
    );
  }

  const [historyResult, auditResult] = await Promise.all([
    admin.from("status_history").insert(
      blockedIds.map((petshopId) => ({
        petshop_id: petshopId,
        entity_table: "petshops",
        entity_id: petshopId,
        from_status: "trial",
        to_status: "blocked",
        notes: "Trial gratuito de 7 dias expirado automaticamente.",
      })),
    ),
    admin.from("audit_logs").insert(
      blockedIds.map((petshopId) => ({
        petshop_id: petshopId,
        action: "trial.expired",
        entity_table: "petshops",
        entity_id: petshopId,
        metadata: {
          source: "vercel_cron",
          due_date: subscriptionByPetshop.get(petshopId)?.due_date ?? null,
        },
      })),
    ),
  ]);

  if (historyResult.error || auditResult.error) {
    return NextResponse.json(
      {
        ok: false,
        blocked: blockedIds.length,
        error: historyResult.error?.message ?? auditResult.error?.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, blocked: blockedIds.length });
}

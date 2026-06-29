import { redirect } from "next/navigation";
import {
  CobrancasManager,
  type PaymentRow,
  type PlatformPix,
} from "@/components/admin-cobrancas/cobrancas-manager";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminCobrancasPage() {
  const session = await getSession();
  if (!session || session.user.globalRole !== "admin_master") {
    redirect("/login?error=not-authorized");
  }
  const admin = createAdminClient();
  if (!admin) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Service role do Supabase não configurado.
      </div>
    );
  }

  const [payRes, subRes, shopRes, pixRes] = await Promise.all([
    admin
      .from("payments")
      .select("id, subscription_id, petshop_id, amount_cents, paid_at, status, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("subscriptions")
      .select("id, petshop_id, plan_name, amount_cents, due_date, status")
      .is("deleted_at", null),
    admin
      .from("petshops")
      .select("id, name, subdomain")
      .is("deleted_at", null),
    admin
      .from("platform_settings")
      .select("pix_key, pix_holder_name")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const shopMap = new Map((shopRes.data ?? []).map((p) => [p.id, p]));
  const subMap = new Map((subRes.data ?? []).map((s) => [s.id, s]));

  type RawPayment = {
    id: string;
    subscription_id: string;
    petshop_id: string;
    amount_cents: number;
    paid_at: string | null;
    status: string;
  };

  const payments: PaymentRow[] = ((payRes.data ?? []) as RawPayment[]).map((p) => {
    const shop = shopMap.get(p.petshop_id);
    const sub = subMap.get(p.subscription_id);
    return {
      paymentId: p.id,
      subscriptionId: p.subscription_id,
      petshopName: shop?.name ?? "—",
      subdomain: shop?.subdomain ?? "—",
      amountCents: p.amount_cents,
      planName: sub?.plan_name ?? "—",
      dueDate: sub?.due_date ?? "",
      paidAt: p.paid_at,
      status: p.status,
    };
  });

  // Add "no_payment" virtual rows: subscriptions that don't have a payment yet
  const subsWithPayment = new Set(payments.map((p) => p.subscriptionId));
  for (const s of subRes.data ?? []) {
    if (subsWithPayment.has(s.id)) continue;
    const shop = shopMap.get(s.petshop_id);
    payments.push({
      paymentId: null,
      subscriptionId: s.id,
      petshopName: shop?.name ?? "—",
      subdomain: shop?.subdomain ?? "—",
      amountCents: s.amount_cents,
      planName: s.plan_name,
      dueDate: s.due_date,
      paidAt: null,
      status: "no_payment",
    });
  }

  const pix: PlatformPix = {
    pixKey: pixRes.data?.pix_key ?? null,
    pixHolderName: pixRes.data?.pix_holder_name ?? null,
  };

  return <CobrancasManager payments={payments} pix={pix} />;
}

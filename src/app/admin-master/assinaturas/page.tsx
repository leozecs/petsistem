import { redirect } from "next/navigation";
import {
  AssinaturasManager,
  type SubscriptionRow,
  type PlanOption,
} from "@/components/admin-assinaturas/assinaturas-manager";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminAssinaturasPage() {
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

  const [shopsRes, subsRes, plansRes] = await Promise.all([
    admin
      .from("petshops")
      .select("id, name, subdomain, plan_id, plan_name")
      .is("deleted_at", null)
      .order("name"),
    admin
      .from("subscriptions")
      .select("id, petshop_id, plan_name, amount_cents, due_date, status, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    admin
      .from("plans")
      .select("id, name, price_cents")
      .eq("active", true)
      .order("price_cents"),
  ]);

  // Latest subscription per petshop
  const latestByShop = new Map<
    string,
    {
      id: string;
      plan_name: string;
      amount_cents: number;
      due_date: string;
      status: string;
    }
  >();
  for (const s of subsRes.data ?? []) {
    if (!latestByShop.has(s.petshop_id)) {
      latestByShop.set(s.petshop_id, {
        id: s.id,
        plan_name: s.plan_name,
        amount_cents: s.amount_cents,
        due_date: s.due_date,
        status: s.status,
      });
    }
  }

  const rows: SubscriptionRow[] = (shopsRes.data ?? []).map((p) => {
    const sub = latestByShop.get(p.id);
    return {
      subscriptionId: sub?.id ?? null,
      petshopId: p.id,
      petshopName: p.name,
      subdomain: p.subdomain,
      planId: p.plan_id,
      planName: p.plan_name,
      amountCents: sub?.amount_cents ?? null,
      dueDate: sub?.due_date ?? null,
      status: (sub?.status as SubscriptionRow["status"]) ?? "no_subscription",
    };
  });

  const plans: PlanOption[] = plansRes.data ?? [];

  return <AssinaturasManager subscriptions={rows} plans={plans} />;
}

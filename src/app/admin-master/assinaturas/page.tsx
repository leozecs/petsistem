import { redirect } from "next/navigation";
import {
  AssinaturasManager,
  type SubscriptionRow,
  type PlanOption,
  type MonthOption,
} from "@/components/admin-assinaturas/assinaturas-manager";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// Aba unificada: Assinaturas + Cobrança. Cada loja aparece como uma linha, com
// status agregado do payment mais recente + subscription vigente. O filtro por
// mês limita as linhas às faturas cujo due_date ou paid_at cai no mês escolhido.
export default async function AdminAssinaturasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string }>;
}) {
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

  const params = await searchParams;
  const now = new Date();
  // Formato: "YYYY-MM". "all" = sem filtro.
  const rawMonth = (params.month ?? "").trim();
  const filterMonth = /^\d{4}-\d{2}$/.test(rawMonth)
    ? rawMonth
    : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const showAllMonths = rawMonth === "all";

  const statusFilter = (params.status ?? "all").trim();

  const [shopsRes, subsRes, paysRes, plansRes] = await Promise.all([
    admin
      .from("petshops")
      .select(
        "id, name, subdomain, status, plan_id, plan_name, whatsapp, phone, billing_blocked_at",
      )
      .is("deleted_at", null)
      .order("name"),
    admin
      .from("subscriptions")
      .select(
        "id, petshop_id, plan_name, amount_cents, billing_cycle, due_date, status, created_at",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    admin
      .from("payments")
      .select(
        "id, subscription_id, petshop_id, amount_cents, billing_cycle, paid_at, status, created_at",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    admin
      .from("plans")
      .select("id, name, price_cents")
      .eq("active", true)
      .order("price_cents"),
  ]);

  // Latest subscription per petshop
  type SubRaw = {
    id: string;
    petshop_id: string;
    plan_name: string;
    amount_cents: number;
    billing_cycle: "monthly" | "annual" | null;
    due_date: string;
    status: string;
  };
  const latestSub = new Map<string, SubRaw>();
  for (const s of (subsRes.data ?? []) as SubRaw[]) {
    if (!latestSub.has(s.petshop_id)) latestSub.set(s.petshop_id, s);
  }

  type PayRaw = {
    id: string;
    subscription_id: string;
    petshop_id: string;
    amount_cents: number;
    billing_cycle: "monthly" | "annual" | null;
    paid_at: string | null;
    status: string;
  };
  const latestPayBySub = new Map<string, PayRaw>();
  for (const p of (paysRes.data ?? []) as PayRaw[]) {
    if (!latestPayBySub.has(p.subscription_id)) {
      latestPayBySub.set(p.subscription_id, p);
    }
  }

  const rows: SubscriptionRow[] = (shopsRes.data ?? []).map((p) => {
    const sub = latestSub.get(p.id);
    const pay = sub ? latestPayBySub.get(sub.id) : undefined;
    return {
      petshopId: p.id,
      petshopName: p.name,
      subdomain: p.subdomain,
      whatsapp: p.whatsapp ?? p.phone ?? null,
      shopStatus: p.status,
      billingBlockedAt: p.billing_blocked_at,
      planId: p.plan_id,
      planName: p.plan_name,
      subscriptionId: sub?.id ?? null,
      amountCents: sub?.amount_cents ?? null,
      billingCycle: (sub?.billing_cycle as "monthly" | "annual" | null) ?? "monthly",
      dueDate: sub?.due_date ?? null,
      subscriptionStatus: (sub?.status as SubscriptionRow["subscriptionStatus"]) ?? "no_subscription",
      paymentId: pay?.id ?? null,
      paidAt: pay?.paid_at ?? null,
      paymentStatus: pay?.status ?? "no_payment",
    };
  });

  // Filtro por mês: mantém linhas cujo due_date OU paid_at caem no mês.
  const monthFiltered = showAllMonths
    ? rows
    : rows.filter((r) => {
        const [y, m] = filterMonth.split("-").map(Number);
        const ym = (d: string | null) => (d ? d.slice(0, 7) : null);
        return (
          ym(r.dueDate) === filterMonth ||
          ym(r.paidAt) === filterMonth ||
          // Loja recém-cadastrada bloqueada aparece no mês atual pra que o admin
          // veja "Liberar login" mesmo antes da subscription/payment existir.
          (r.shopStatus === "blocked" &&
            r.billingBlockedAt?.slice(0, 7) === filterMonth) ||
          (r.subscriptionStatus === "no_subscription" &&
            m === now.getUTCMonth() + 1 &&
            y === now.getUTCFullYear())
        );
      });

  const statusFiltered =
    statusFilter === "all"
      ? monthFiltered
      : statusFilter === "blocked"
        ? monthFiltered.filter((r) => r.shopStatus === "blocked")
        : statusFilter === "paid"
          ? monthFiltered.filter((r) => r.paymentStatus === "paid")
          : statusFilter === "pending"
            ? monthFiltered.filter(
                (r) =>
                  r.paymentStatus === "pending" ||
                  r.paymentStatus === "confirming" ||
                  r.paymentStatus === "no_payment",
              )
            : monthFiltered;

  // Constrói lista dos últimos 12 meses pra dropdown.
  const monthOptions: MonthOption[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
    monthOptions.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  const plans: PlanOption[] = plansRes.data ?? [];

  return (
    <AssinaturasManager
      subscriptions={statusFiltered}
      plans={plans}
      monthOptions={monthOptions}
      currentMonth={showAllMonths ? "all" : filterMonth}
      currentStatus={statusFilter}
    />
  );
}

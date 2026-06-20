import { redirect } from "next/navigation";
import { RelatoriosView } from "@/components/relatorios/relatorios-view";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import {
  petshopDateOf,
  todayPetshopMidnightUtc,
  utcInstantOfPetshopMidnight,
} from "@/lib/calendar/time";

function parseMonthParam(input: string | undefined): { year: number; month0: number } {
  if (input && /^\d{4}-\d{2}$/.test(input)) {
    const [y, m] = input.split("-").map(Number);
    if (y && m && m >= 1 && m <= 12) return { year: y, month0: m - 1 };
  }
  const t = petshopDateOf(todayPetshopMidnightUtc());
  return { year: t.year, month0: t.month0 };
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    redirect("/app");
  }
  const params = await searchParams;
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const { year, month0 } = parseMonthParam(params.month);
  const monthStart = utcInstantOfPetshopMidnight(year, month0, 1);
  const monthEnd = utcInstantOfPetshopMidnight(year, month0 + 1, 1);
  const monthIso = `${year}-${String(month0 + 1).padStart(2, "0")}`;
  const firstDayIso = `${monthIso}-01`;
  const lastDayDate = new Date(monthEnd.getTime() - 86_400_000);
  const lastParts = petshopDateOf(lastDayDate);
  const lastDayIso = `${lastParts.year}-${String(lastParts.month0 + 1).padStart(2, "0")}-${String(lastParts.day).padStart(2, "0")}`;

  const [chargesRes, expensesRes] = await Promise.all([
    supabase
      .from("appointment_charges")
      .select(
        "appointment_id, price_cents, payment_method, paid_at, appointment:appointments!inner(starts_at, service:services(name))",
      )
      .eq("petshop_id", membership.petshopId)
      .not("paid_at", "is", null)
      .gte("paid_at", monthStart.toISOString())
      .lt("paid_at", monthEnd.toISOString()),
    supabase
      .from("expenses")
      .select("id, description, amount_cents, due_date, payment_method")
      .eq("petshop_id", membership.petshopId)
      .gte("due_date", firstDayIso)
      .lte("due_date", lastDayIso)
      .is("deleted_at", null),
  ]);

  type RawCharge = {
    appointment_id: string;
    price_cents: number;
    payment_method: string | null;
    paid_at: string | null;
    appointment: { starts_at: string; service: { name: string } | null } | null;
  };

  const charges = ((chargesRes.data ?? []) as RawCharge[]).map((c) => ({
    priceCents: c.price_cents,
    paymentMethod: c.payment_method,
    paidAt: c.paid_at,
    serviceName: c.appointment?.service?.name ?? "Sem serviço",
  }));

  const expenses = (expensesRes.data ?? []).map((e) => ({
    description: e.description,
    amountCents: e.amount_cents,
    occurredOn: e.due_date,
    paymentMethod: e.payment_method,
  }));

  return (
    <RelatoriosView
      monthIso={monthIso}
      year={year}
      month0={month0}
      charges={charges}
      expenses={expenses}
    />
  );
}

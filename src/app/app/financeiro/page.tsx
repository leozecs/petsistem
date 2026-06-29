import { redirect } from "next/navigation";
import { FinanceiroView, type FinanceChartPoint, type Movement } from "@/components/financeiro/financeiro-view";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import { petshopDateOf, todayPetshopMidnightUtc, utcInstantOfPetshopMidnight } from "@/lib/calendar/time";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const isoDay = (year: number, month0: number, day: number) => `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ year?: string; semester?: string }> }) {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) redirect("/app");
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const timeZone = membership.petshop.timezone;
  const today = petshopDateOf(todayPetshopMidnightUtc(timeZone), timeZone);
  const params = await searchParams;
  const requestedYear = Number(params.year);
  const selectedYear = Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= today.year + 1 ? requestedYear : today.year;
  const selectedSemester: 1 | 2 = params.semester === "1" || params.semester === "2" ? Number(params.semester) as 1 | 2 : (today.month0 < 6 ? 1 : 2);
  const startMonth = selectedSemester === 1 ? 0 : 6;
  const periodStart = isoDay(selectedYear, startMonth, 1);
  const periodEnd = isoDay(selectedYear, startMonth + 6, 1);
  const periodStartTs = utcInstantOfPetshopMidnight(selectedYear, startMonth, 1, timeZone).toISOString();
  const periodEndTs = utcInstantOfPetshopMidnight(selectedYear, startMonth + 6, 1, timeZone).toISOString();

  const [chargesRes, revenuesRes, expensesRes, categoriesRes] = await Promise.all([
    supabase.from("appointment_charges").select("appointment_id, price_cents, payment_method, paid_at, appointment:appointments!inner(id, tutor_name, service:services(name), pet:pets(name), client:clients(name))").eq("petshop_id", membership.petshopId).not("paid_at", "is", null).gte("paid_at", periodStartTs).lt("paid_at", periodEndTs),
    supabase.from("revenue_items").select("id, description, amount_cents, payment_method, received_at, category:categories(name)").eq("petshop_id", membership.petshopId).is("deleted_at", null).gte("received_at", periodStart).lt("received_at", periodEnd).order("received_at", { ascending: false }),
    supabase.from("expenses").select("id, description, amount_cents, payment_method, due_date, paid_at, category:categories(name)").eq("petshop_id", membership.petshopId).is("deleted_at", null).gte("due_date", periodStart).lt("due_date", periodEnd).order("due_date", { ascending: false }),
    supabase.from("categories").select("id, kind, name").eq("petshop_id", membership.petshopId).eq("active", true).order("kind").order("position"),
  ]);

  type Charge = { appointment_id: string; price_cents: number; payment_method: string | null; paid_at: string; appointment: { tutor_name: string | null; service: { name: string } | null; pet: { name: string } | null; client: { name: string } | null } | null };
  const charges = (chargesRes.data ?? []) as Charge[];
  const revenues = revenuesRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const chart: FinanceChartPoint[] = Array.from({ length: 6 }, (_, index) => ({ month: MONTHS[startMonth + index], revenueCents: 0, expenseCents: 0, profitCents: 0 }));
  const chartIndex = (date: string) => Number(date.slice(5, 7)) - 1 - startMonth;
  for (const charge of charges) { const index = chartIndex(charge.paid_at); if (chart[index]) chart[index].revenueCents += charge.price_cents; }
  for (const revenue of revenues) { const index = chartIndex(revenue.received_at); if (chart[index]) chart[index].revenueCents += revenue.amount_cents; }
  for (const expense of expenses) { const index = chartIndex(expense.due_date); if (chart[index]) chart[index].expenseCents += expense.amount_cents; }
  for (const point of chart) point.profitCents = point.revenueCents - point.expenseCents;

  const movements: Movement[] = [];
  for (const charge of charges) {
    if (!charge.appointment) continue;
    const pet = charge.appointment.pet?.name;
    const tutor = charge.appointment.tutor_name ?? charge.appointment.client?.name;
    const service = charge.appointment.service?.name ?? "Atendimento";
    movements.push({ id: `charge-${charge.appointment_id}`, kind: "revenue", source: "service", description: pet ? `${service} — ${pet}${tutor ? ` (${tutor})` : ""}` : service, categoryName: null, amountCents: charge.price_cents, paymentMethod: charge.payment_method, occurredAt: charge.paid_at, deletable: false });
  }
  for (const revenue of revenues) {
    const category = Array.isArray(revenue.category) ? revenue.category[0]?.name : (revenue.category as { name: string } | null)?.name;
    movements.push({ id: `rev-${revenue.id}`, rowId: revenue.id, kind: "revenue", source: "manual", description: revenue.description, categoryName: category ?? null, amountCents: revenue.amount_cents, paymentMethod: revenue.payment_method, occurredAt: `${revenue.received_at}T12:00:00Z`, deletable: true });
  }
  for (const expense of expenses) {
    const category = Array.isArray(expense.category) ? expense.category[0]?.name : (expense.category as { name: string } | null)?.name;
    movements.push({ id: `exp-${expense.id}`, rowId: expense.id, kind: "expense", source: "manual", description: expense.description, categoryName: category ?? null, amountCents: expense.amount_cents, paymentMethod: expense.payment_method, occurredAt: `${expense.due_date}T12:00:00Z`, paid: expense.paid_at != null, deletable: true });
  }
  movements.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return <FinanceiroView chart={chart} movements={movements} categories={(categoriesRes.data ?? []).map((category) => ({ id: category.id, kind: category.kind as "revenue" | "expense", name: category.name }))} todayIso={isoDay(today.year, today.month0, today.day)} canDelete selectedYear={selectedYear} selectedSemester={selectedSemester} availableYears={Array.from({ length: Math.max(1, today.year - 2024 + 1) }, (_, index) => today.year - index)} />;
}

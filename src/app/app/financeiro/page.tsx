import { redirect } from "next/navigation";
import { FinanceiroView, type Movement, type Kpis } from "@/components/financeiro/financeiro-view";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import {
  petshopDateOf,
  todayPetshopMidnightUtc,
  utcInstantOfPetshopMidnight,
} from "@/lib/calendar/time";

function isoDay(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function startOfWeek(year: number, month0: number, day: number): { year: number; month0: number; day: number } {
  // Semana operacional petshop: segunda como início (6x1, segunda = depois do dia off).
  const midnight = utcInstantOfPetshopMidnight(year, month0, day);
  const wd = ((midnight.getUTCDay() + 6) % 7); // 0=Mon ... 6=Sun
  const monday = new Date(midnight.getTime() - wd * 86_400_000);
  return petshopDateOf(monday);
}

export default async function FinanceiroPage() {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) {
    redirect("/app");
  }

  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const today = petshopDateOf(todayPetshopMidnightUtc());
  const todayIso = isoDay(today.year, today.month0, today.day);
  const monthStart = isoDay(today.year, today.month0, 1);
  const monthEndDate = new Date(
    utcInstantOfPetshopMidnight(today.year, today.month0 + 1, 1).getTime() - 86_400_000,
  );
  const monthEndParts = petshopDateOf(monthEndDate);
  const monthEnd = isoDay(monthEndParts.year, monthEndParts.month0, monthEndParts.day);
  const weekStart = startOfWeek(today.year, today.month0, today.day);
  const weekStartIso = isoDay(weekStart.year, weekStart.month0, weekStart.day);

  // Janela de busca: do início do mês (pega tudo do mês pra KPIs) até hoje.
  // Lista exibe últimos 30 dias do período devolvido.
  const monthStartTs = utcInstantOfPetshopMidnight(today.year, today.month0, 1).toISOString();
  const nextMonthStartTs = utcInstantOfPetshopMidnight(today.year, today.month0 + 1, 1).toISOString();

  const [chargesRes, revenuesRes, expensesRes, categoriesRes, pendingChargesRes] = await Promise.all([
    // Recebidos no mês (charges com paid_at)
    supabase
      .from("appointment_charges")
      .select(
        "appointment_id, price_cents, payment_method, paid_at, appointment:appointments!inner(id, starts_at, tutor_name, service:services(name), pet:pets(name), client:clients(name))",
      )
      .eq("petshop_id", membership.petshopId)
      .not("paid_at", "is", null)
      .gte("paid_at", monthStartTs)
      .lt("paid_at", nextMonthStartTs),
    // Receitas avulsas do mês
    supabase
      .from("revenue_items")
      .select("id, description, amount_cents, payment_method, received_at, category:categories(name)")
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null)
      .gte("received_at", monthStart)
      .lte("received_at", monthEnd)
      .order("received_at", { ascending: false }),
    // Despesas do mês (todas; pagas + a pagar)
    supabase
      .from("expenses")
      .select("id, description, amount_cents, payment_method, due_date, paid_at, category:categories(name)")
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null)
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd)
      .order("due_date", { ascending: false }),
    // Categorias ativas pra modais
    supabase
      .from("categories")
      .select("id, kind, name")
      .eq("petshop_id", membership.petshopId)
      .eq("active", true)
      .order("kind")
      .order("position"),
    // A receber: charges futuros sem paid_at (appointments confirmed/in-progress/finalizado mas sem pagto)
    supabase
      .from("appointment_charges")
      .select(
        "appointment_id, price_cents, appointment:appointments!inner(status, starts_at)",
      )
      .eq("petshop_id", membership.petshopId)
      .is("paid_at", null),
  ]);

  type RawCharge = {
    appointment_id: string;
    price_cents: number;
    payment_method: string | null;
    paid_at: string;
    appointment: {
      id: string;
      starts_at: string;
      tutor_name: string | null;
      service: { name: string } | null;
      pet: { name: string } | null;
      client: { name: string } | null;
    } | null;
  };

  const charges = (chargesRes.data ?? []) as RawCharge[];
  const revenues = revenuesRes.data ?? [];
  const expenses = expensesRes.data ?? [];

  const sum = (arr: { amount_cents?: number; price_cents?: number }[]): number =>
    arr.reduce((acc, x) => acc + (x.amount_cents ?? x.price_cents ?? 0), 0);

  // KPIs
  const chargesToday = charges.filter((c) => c.paid_at?.slice(0, 10) === todayIso);
  const revenuesToday = revenues.filter((r) => r.received_at === todayIso);
  const receitaHoje = sum(chargesToday) + sum(revenuesToday);

  const chargesWeek = charges.filter((c) => (c.paid_at ?? "") >= weekStartIso);
  const revenuesWeek = revenues.filter((r) => r.received_at >= weekStartIso);
  const receitaSemana = sum(chargesWeek) + sum(revenuesWeek);

  const receitaMes = sum(charges) + sum(revenues);
  const despesaMesPaga = sum(expenses.filter((e) => e.paid_at != null));
  const despesaMesTotal = sum(expenses);
  const saldoMes = receitaMes - despesaMesPaga;

  const ticketMedio = charges.length > 0 ? sum(charges) / charges.length : 0;

  type PendingCharge = {
    appointment_id: string;
    price_cents: number;
    appointment: { status: string; starts_at: string } | null;
  };
  const pendingCharges = ((pendingChargesRes.data ?? []) as PendingCharge[]).filter(
    (c) => c.appointment && ["confirmed", "in_progress", "finalizado"].includes(c.appointment.status),
  );
  const aReceber = sum(pendingCharges);
  const aPagar = despesaMesTotal - despesaMesPaga;

  const kpis: Kpis = {
    receitaHoje,
    receitaSemana,
    receitaMes,
    despesaMes: despesaMesPaga,
    saldoMes,
    ticketMedio,
    aReceber,
    aPagar,
    atendimentosPagosMes: charges.length,
  };

  // Movimentações unificadas
  const moves: Movement[] = [];

  for (const c of charges) {
    if (!c.appointment) continue;
    const petName = c.appointment.pet?.name ?? null;
    const tutorName = c.appointment.tutor_name ?? c.appointment.client?.name ?? null;
    const svcName = c.appointment.service?.name ?? "Atendimento";
    const label = petName
      ? `${svcName} — ${petName}${tutorName ? ` (${tutorName})` : ""}`
      : svcName;
    moves.push({
      id: `charge-${c.appointment_id}`,
      kind: "revenue",
      source: "service",
      description: label,
      categoryName: null,
      amountCents: c.price_cents,
      paymentMethod: c.payment_method,
      occurredAt: c.paid_at,
      deletable: false,
    });
  }

  for (const r of revenues) {
    const cat =
      Array.isArray(r.category) ? r.category[0]?.name : (r.category as { name: string } | null)?.name;
    moves.push({
      id: `rev-${r.id}`,
      rowId: r.id,
      kind: "revenue",
      source: "manual",
      description: r.description,
      categoryName: cat ?? null,
      amountCents: r.amount_cents,
      paymentMethod: r.payment_method,
      occurredAt: `${r.received_at}T12:00:00Z`,
      deletable: true,
    });
  }

  for (const e of expenses) {
    const cat =
      Array.isArray(e.category) ? e.category[0]?.name : (e.category as { name: string } | null)?.name;
    moves.push({
      id: `exp-${e.id}`,
      rowId: e.id,
      kind: "expense",
      source: "manual",
      description: e.description,
      categoryName: cat ?? null,
      amountCents: e.amount_cents,
      paymentMethod: e.payment_method,
      occurredAt: `${e.due_date}T12:00:00Z`,
      paid: e.paid_at != null,
      deletable: true,
    });
  }

  moves.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));

  const categories = (categoriesRes.data ?? []).map((c) => ({
    id: c.id,
    kind: c.kind as "revenue" | "expense",
    name: c.name,
  }));

  const canManage = hasRole(membership, ["owner"]);

  return (
    <FinanceiroView
      kpis={kpis}
      movements={moves}
      categories={categories}
      todayIso={todayIso}
      canDelete={canManage}
    />
  );
}

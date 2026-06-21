import { DashboardView, type DashboardAppt } from "@/components/dashboard/dashboard-view";
import { requireTenant } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import {
  addMinutes,
  petshopDateOf,
  todayPetshopMidnightUtc,
} from "@/lib/calendar/time";
import type { Database } from "@/lib/supabase/database.types";

type ServiceArea = Database["public"]["Enums"]["service_area"];

function allowedAreas(role: string): ServiceArea[] {
  if (role === "owner") return ["grooming", "veterinary"];
  if (role === "attendant") return ["grooming"];
  if (role === "veterinarian") return ["veterinary"];
  return [];
}

export default async function AppDashboardPage() {
  const { membership } = await requireTenant();
  const supabase = await createClient();
  if (!supabase) {
    return (
      <DashboardView
        canSeeFinance={false}
        userName={null}
        kpis={{
          appointmentsToday: 0,
          receivedCents: 0,
          pendingCents: 0,
          expensesCents: 0,
          finishedCount: 0,
        }}
        inProgress={[]}
        upcoming={[]}
        alerts={{ pending: [], overduePayments: [], emptyTomorrow: false }}
      />
    );
  }

  const areas = allowedAreas(membership.role);
  if (areas.length === 0) {
    return (
      <DashboardView
        canSeeFinance={membership.role === "owner"}
        userName={null}
        kpis={{
          appointmentsToday: 0,
          receivedCents: 0,
          pendingCents: 0,
          expensesCents: 0,
          finishedCount: 0,
        }}
        inProgress={[]}
        upcoming={[]}
        alerts={{ pending: [], overduePayments: [], emptyTomorrow: false }}
      />
    );
  }

  const todayMidnight = todayPetshopMidnightUtc();
  const tomorrowMidnight = addMinutes(todayMidnight, 24 * 60);
  const dayAfterTomorrowMidnight = addMinutes(tomorrowMidnight, 24 * 60);
  const todayParts = petshopDateOf(todayMidnight);
  const todayIso = `${todayParts.year}-${String(todayParts.month0 + 1).padStart(2, "0")}-${String(todayParts.day).padStart(2, "0")}`;

  // Solicitações do site público entram com status `pending` e podem ser pra
  // qualquer data futura. Buscamos até 14 dias à frente — caso comum:
  // operador abre o dashboard e quer confirmar/recusar tudo que chegou.
  const fourteenDaysAhead = addMinutes(todayMidnight, 14 * 24 * 60);

  const [todayApptRes, expensesRes, tomorrowApptRes, overdueRes, futurePendingRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, pet:pets(name), service:services(name), tutor_name, client:clients(name), calendar:calendars!inner(area), charge:appointment_charges(price_cents, paid_at)",
      )
      .eq("petshop_id", membership.petshopId)
      .gte("starts_at", todayMidnight.toISOString())
      .lt("starts_at", tomorrowMidnight.toISOString())
      .is("deleted_at", null)
      .order("starts_at"),
    supabase
      .from("expenses")
      .select("id, amount_cents")
      .eq("petshop_id", membership.petshopId)
      .eq("due_date", todayIso)
      .is("deleted_at", null),
    supabase
      .from("appointments")
      .select("id, calendar:calendars!inner(area)")
      .eq("petshop_id", membership.petshopId)
      .gte("starts_at", tomorrowMidnight.toISOString())
      .lt("starts_at", dayAfterTomorrowMidnight.toISOString())
      .is("deleted_at", null),
    supabase
      .from("appointment_charges")
      .select(
        "appointment_id, price_cents, paid_at, appointment:appointments!inner(id, starts_at, ends_at, status, pet:pets(name), service:services(name), tutor_name, client:clients(name), calendar:calendars!inner(area))",
      )
      .eq("petshop_id", membership.petshopId)
      .is("paid_at", null)
      .lt("appointment.ends_at", new Date().toISOString())
      .gte("appointment.starts_at", addMinutes(todayMidnight, -7 * 24 * 60).toISOString())
      .order("appointment(starts_at)", { ascending: false })
      .limit(20),
    supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, pet:pets(name), service:services(name), tutor_name, client:clients(name), calendar:calendars!inner(area)",
      )
      .eq("petshop_id", membership.petshopId)
      .eq("status", "pending")
      .gte("starts_at", todayMidnight.toISOString())
      .lt("starts_at", fourteenDaysAhead.toISOString())
      .is("deleted_at", null)
      .order("starts_at"),
  ]);

  type RawAppt = {
    id: string;
    starts_at: string;
    ends_at: string;
    status: DashboardAppt["status"];
    pet: { name: string } | null;
    service: { name: string } | null;
    tutor_name: string | null;
    client: { name: string } | null;
    calendar: { area: ServiceArea } | null;
    charge: { price_cents: number; paid_at: string | null }[] | null;
  };

  // Filter by allowed areas (defense in depth on top of role).
  const todayAppts = ((todayApptRes.data ?? []) as RawAppt[]).filter(
    (a) => a.calendar !== null && areas.includes(a.calendar.area),
  );

  function toDashboardAppt(a: RawAppt): DashboardAppt {
    return {
      id: a.id,
      startIso: a.starts_at,
      endIso: a.ends_at,
      status: a.status,
      petName: a.pet?.name ?? null,
      serviceName: a.service?.name ?? null,
      tutorName: a.tutor_name ?? a.client?.name ?? null,
      area: (a.calendar?.area ?? "grooming") as ServiceArea,
    };
  }

  const inProgress = todayAppts
    .filter((a) => a.status === "in_progress")
    .map(toDashboardAppt);

  const upcoming = todayAppts
    .filter(
      (a) =>
        (a.status === "confirmed" || a.status === "checked_in") &&
        new Date(a.starts_at) >= new Date(),
    )
    .slice(0, 10)
    .map(toDashboardAppt);

  // KPIs
  let receivedCents = 0;
  let pendingCents = 0;
  let finishedCount = 0;
  for (const a of todayAppts) {
    const charge = a.charge?.[0];
    if (a.status === "finished") finishedCount++;
    if (charge) {
      if (charge.paid_at) receivedCents += charge.price_cents;
      else if (a.status !== "cancelled" && a.status !== "no_show") {
        pendingCents += charge.price_cents;
      }
    }
  }
  const expensesCents = (expensesRes.data ?? []).reduce(
    (s, e) => s + e.amount_cents,
    0,
  );

  const tomorrowCount = ((tomorrowApptRes.data ?? []) as {
    calendar: { area: ServiceArea } | null;
  }[]).filter((r) => r.calendar !== null && areas.includes(r.calendar.area)).length;

  // Alerts
  type RawOverdue = {
    appointment_id: string;
    price_cents: number;
    paid_at: string | null;
    appointment: RawAppt | null;
  };
  const overduePayments = ((overdueRes.data ?? []) as RawOverdue[])
    .filter((o) => o.appointment !== null && areas.includes(o.appointment.calendar?.area as ServiceArea))
    .map((o) => ({
      ...toDashboardAppt(o.appointment!),
      priceCents: o.price_cents,
    }));

  // Pendentes considera os próximos 14 dias — não só hoje. Solicitações que
  // vieram pelo site público costumam ser pra dias futuros.
  const pendingFuture = ((futurePendingRes.data ?? []) as RawAppt[])
    .filter((a) => a.calendar !== null && areas.includes(a.calendar.area))
    .map(toDashboardAppt);

  return (
    <DashboardView
      canSeeFinance={membership.role === "owner"}
      userName={null}
      kpis={{
        appointmentsToday: todayAppts.length,
        receivedCents,
        pendingCents,
        expensesCents,
        finishedCount,
      }}
      inProgress={inProgress}
      upcoming={upcoming}
      alerts={{
        pending: pendingFuture,
        overduePayments,
        emptyTomorrow: tomorrowCount === 0,
      }}
    />
  );
}

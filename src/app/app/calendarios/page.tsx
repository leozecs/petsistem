import { redirect } from "next/navigation";
import { CalendariosView } from "@/components/calendarios/calendarios-view";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import {
  addMinutes,
  petshopDateOf,
  todayPetshopMidnightUtc,
  utcInstantOfPetshopMidnight,
} from "@/lib/calendar/time";
import type { AppointmentInput, ScheduleInput } from "@/lib/calendar/availability";
import type { Database } from "@/lib/supabase/database.types";

type ServiceArea = Database["public"]["Enums"]["service_area"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type CalendarRow = Database["public"]["Tables"]["calendars"]["Row"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseDateParam(input: string | undefined, timeZone: string): Date {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    if (y && m && d) return utcInstantOfPetshopMidnight(y, m - 1, d, timeZone);
  }
  return todayPetshopMidnightUtc(timeZone);
}

function allowedAreas(role: string): ServiceArea[] {
  if (role === "owner") return ["grooming", "veterinary"];
  if (role === "attendant") return ["grooming"];
  if (role === "veterinarian") return ["veterinary"];
  return [];
}

function isoDateOnly(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default async function CalendariosPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; date?: string; calendar?: string }>;
}) {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant", "veterinarian"])) {
    redirect("/app");
  }

  const params = await searchParams;
  const areas = allowedAreas(membership.role);
  if (areas.length === 0) redirect("/app");

  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const { data: petshopRow } = await supabase
    .from("petshops")
    .select("slot_minutes, timezone")
    .eq("id", membership.petshopId)
    .maybeSingle();
  const slotMinutes = petshopRow?.slot_minutes ?? 30;
  const timeZone = petshopRow?.timezone ?? membership.petshop.timezone;

  // Pre-calculate the date range from URL params (pure, no async) so we can
  // start the appointments fetch in the same Promise.all as the calendar list.
  const selectedDayUtc = parseDateParam(params.date, timeZone);
  const selectedParts = petshopDateOf(selectedDayUtc, timeZone);
  const activeDateIso = isoDateOnly(selectedParts.year, selectedParts.month0, selectedParts.day);
  const monthStart = utcInstantOfPetshopMidnight(selectedParts.year, selectedParts.month0, 1, timeZone);
  const monthEnd = utcInstantOfPetshopMidnight(selectedParts.year, selectedParts.month0 + 1, 1, timeZone);
  const fetchStart = addMinutes(monthStart, -7 * 24 * 60);
  const fetchEnd = addMinutes(monthEnd, 14 * 24 * 60);

  // Optimistic calendar hint: if params.calendar is a valid UUID use it to start
  // the schedules + appointments fetch in parallel with the rest. If it turns out
  // to be wrong (doesn't belong to this petshop/area), we re-fetch below.
  // Security: all queries filter by petshop_id so an invalid UUID just returns [].
  const calendarHint = UUID_RE.test(params.calendar ?? "") ? params.calendar! : null;

  const activeArea = (areas.includes(params.area as ServiceArea) ? params.area : areas[0]) as ServiceArea;

  const [
    calendarsRes,
    servicesRes,
    clientsRes,
    petsRes,
    schedulesHintRes,
    appointmentsHintRes,
  ] = await Promise.all([
    supabase
      .from("calendars")
      .select("*")
      .eq("petshop_id", membership.petshopId)
      .eq("active", true)
      .in("area", areas),
    supabase
      .from("services")
      .select("*")
      .eq("petshop_id", membership.petshopId)
      .eq("active", true)
      .is("deleted_at", null)
      .in("area", areas)
      .order("area")
      .order("name"),
    supabase
      .from("clients")
      .select("id, name, phone")
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("pets")
      .select("id, name, client_id, species")
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null)
      .order("name"),
    // Optimistic: start schedules + appointments NOW using the calendar hint.
    // If hint is null we resolve immediately with empty data.
    calendarHint
      ? supabase
          .from("schedules")
          .select("weekday, starts_at, ends_at, active")
          .eq("petshop_id", membership.petshopId)
          .eq("calendar_id", calendarHint)
          .eq("active", true)
      : Promise.resolve({ data: null, error: null }),
    calendarHint
      ? supabase
          .from("appointments")
          .select(
            "id, starts_at, ends_at, status, tutor_name, notes, tracking_slug, pet:pets(name), service:services(name, duration_minutes, price_cents), veterinarian:veterinarians(name), employee:employees(name), client:clients(name, phone, whatsapp)",
          )
          .eq("petshop_id", membership.petshopId)
          .eq("calendar_id", calendarHint)
          .gte("starts_at", fetchStart.toISOString())
          .lt("starts_at", fetchEnd.toISOString())
          .is("deleted_at", null)
          .order("starts_at")
      : Promise.resolve({ data: null, error: null }),
  ]);

  const calendars: CalendarRow[] = calendarsRes.data ?? [];
  if (calendars.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Nenhum calendário ativo encontrado para o seu papel nesta loja.
      </div>
    );
  }

  const services: ServiceRow[] = servicesRes.data ?? [];
  const activeCalendar =
    calendars.find((c) => c.id === params.calendar && c.area === activeArea) ??
    calendars.find((c) => c.area === activeArea) ??
    calendars[0]!;

  // If the hint matched the actual calendar, use the prefetched data. Otherwise
  // make a targeted second fetch. In steady-state navigation this branch is never taken.
  let schedulesData = calendarHint === activeCalendar.id ? schedulesHintRes.data : null;
  let appointmentsData = calendarHint === activeCalendar.id ? appointmentsHintRes.data : null;

  if (schedulesData === null || appointmentsData === null) {
    const [schedulesRes, appointmentsRes] = await Promise.all([
      supabase
        .from("schedules")
        .select("weekday, starts_at, ends_at, active")
        .eq("petshop_id", membership.petshopId)
        .eq("calendar_id", activeCalendar.id)
        .eq("active", true),
      supabase
        .from("appointments")
        .select(
          "id, starts_at, ends_at, status, tutor_name, notes, tracking_slug, pet:pets(name), service:services(name, duration_minutes, price_cents), veterinarian:veterinarians(name), employee:employees(name), client:clients(name, phone, whatsapp)",
        )
        .eq("petshop_id", membership.petshopId)
        .eq("calendar_id", activeCalendar.id)
        .gte("starts_at", fetchStart.toISOString())
        .lt("starts_at", fetchEnd.toISOString())
        .is("deleted_at", null)
        .order("starts_at"),
    ]);
    schedulesData = schedulesRes.data;
    appointmentsData = appointmentsRes.data;
  }

  const schedules: ScheduleInput[] = (schedulesData ?? []).map((s) => ({
    weekday: s.weekday,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    active: s.active,
  }));

  type RawAppt = {
    id: string;
    starts_at: string;
    ends_at: string;
    status: AppointmentInput["status"];
    tutor_name: string | null;
    notes: string | null;
    tracking_slug: string | null;
    pet: { name: string } | null;
    service: { name: string; duration_minutes: number; price_cents: number } | null;
    veterinarian: { name: string } | null;
    employee: { name: string } | null;
    client: { name: string; phone: string; whatsapp: string | null } | null;
  };
  const apptRows = (appointmentsData ?? []) as RawAppt[];

  const appointmentsByDay: Record<
    string,
    Array<{
      id: string;
      startIso: string;
      endIso: string;
      status: AppointmentInput["status"];
      pet_name: string | null;
      service_name: string | null;
      professional_name: string | null;
      tutor_name: string | null;
      tutor_phone: string | null;
      tutor_whatsapp: string | null;
      price_cents: number;
      tracking_slug: string | null;
    }>
  > = {};
  for (const a of apptRows) {
    const startUtc = new Date(a.starts_at);
    const parts = petshopDateOf(startUtc, timeZone);
    const key = isoDateOnly(parts.year, parts.month0, parts.day);
    (appointmentsByDay[key] ??= []).push({
      id: a.id,
      startIso: a.starts_at,
      endIso: a.ends_at,
      status: a.status,
      pet_name: a.pet?.name ?? null,
      service_name: a.service?.name ?? null,
      professional_name: a.veterinarian?.name ?? a.employee?.name ?? null,
      tutor_name: a.tutor_name ?? a.client?.name ?? null,
      tutor_phone: a.client?.phone ?? null,
      tutor_whatsapp: a.client?.whatsapp ?? null,
      price_cents: a.service?.price_cents ?? 0,
      tracking_slug: a.tracking_slug,
    });
  }

  return (
    <CalendariosView
      areas={areas}
      activeArea={activeArea}
      calendars={calendars}
      activeCalendarId={activeCalendar.id}
      activeDateIso={activeDateIso}
      visibleYear={selectedParts.year}
      visibleMonth0={selectedParts.month0}
      services={services}
      clients={clientsRes.data ?? []}
      pets={petsRes.data ?? []}
      schedules={schedules}
      appointmentsByDay={appointmentsByDay}
      petshopName={membership.petshop.name}
      slotMinutes={slotMinutes}
      timeZone={timeZone}
    />
  );
}

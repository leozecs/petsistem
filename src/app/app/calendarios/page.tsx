import { redirect } from "next/navigation";
import { CalendariosView } from "@/components/calendarios/calendarios-view";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import { computeAvailability, type AppointmentInput, type ScheduleInput } from "@/lib/calendar/availability";
import {
  addMinutes,
  petshopDateOf,
  todayPetshopMidnightUtc,
  utcInstantOfPetshopMidnight,
} from "@/lib/calendar/time";
import type { Database } from "@/lib/supabase/database.types";

type ServiceArea = Database["public"]["Enums"]["service_area"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type CalendarRow = Database["public"]["Tables"]["calendars"]["Row"];

function parseDateParam(input: string | undefined): Date {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    if (y && m && d) return utcInstantOfPetshopMidnight(y, m - 1, d);
  }
  return todayPetshopMidnightUtc();
}

function allowedAreas(role: string): ServiceArea[] {
  if (role === "owner") return ["grooming", "veterinary"];
  if (role === "attendant") return ["grooming"];
  if (role === "veterinarian") return ["veterinary"];
  return [];
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

  const [calendarsRes, servicesRes, vetsRes, employeesRes, clientsRes, petsRes] = await Promise.all([
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
      .from("veterinarians")
      .select("id, name, active")
      .eq("petshop_id", membership.petshopId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("employees")
      .select("id, name, active")
      .eq("petshop_id", membership.petshopId)
      .eq("active", true)
      .is("deleted_at", null)
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
  const activeArea = (areas.includes(params.area as ServiceArea) ? params.area : areas[0]) as ServiceArea;
  const activeCalendar =
    calendars.find((c) => c.id === params.calendar && c.area === activeArea) ??
    calendars.find((c) => c.area === activeArea) ??
    calendars[0]!;

  // dayStart is the UTC instant of midnight in the petshop TZ, dayEnd is +24h.
  const dayStart = parseDateParam(params.date);
  const dayEnd = addMinutes(dayStart, 24 * 60);
  const dayParts = petshopDateOf(dayStart);
  const activeDateIso = `${dayParts.year}-${String(dayParts.month0 + 1).padStart(2, "0")}-${String(dayParts.day).padStart(2, "0")}`;

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
        "id, starts_at, ends_at, status, tutor_name, notes, pet:pets(name), service:services(name, duration_minutes), veterinarian:veterinarians(name), employee:employees(name)",
      )
      .eq("petshop_id", membership.petshopId)
      .eq("calendar_id", activeCalendar.id)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .is("deleted_at", null)
      .order("starts_at"),
  ]);

  const schedules: ScheduleInput[] = (schedulesRes.data ?? []).map((s) => ({
    weekday: s.weekday,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    active: s.active,
  }));

  const apptRows = (appointmentsRes.data ?? []) as Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    status: AppointmentInput["status"];
    tutor_name: string | null;
    notes: string | null;
    pet: { name: string } | null;
    service: { name: string; duration_minutes: number } | null;
    veterinarian: { name: string } | null;
    employee: { name: string } | null;
  }>;

  const appointments: AppointmentInput[] = apptRows.map((a) => ({
    id: a.id,
    starts_at: new Date(a.starts_at),
    ends_at: new Date(a.ends_at),
    status: a.status,
    pet_name: a.pet?.name ?? null,
    service_name: a.service?.name ?? null,
    professional_name: a.veterinarian?.name ?? a.employee?.name ?? null,
    tutor_name: a.tutor_name,
  }));

  const defaultService = services.find((s) => s.area === activeArea) ?? services[0] ?? null;
  const defaultSlotMin = defaultService?.duration_minutes ?? 30;
  const slots = computeAvailability({
    petshopMidnightUtc: dayStart,
    schedules,
    appointments,
    slotDurationMin: defaultSlotMin,
    stepMin: 30,
  });

  return (
    <CalendariosView
      areas={areas}
      activeArea={activeArea}
      calendars={calendars}
      activeCalendarId={activeCalendar.id}
      activeDateIso={activeDateIso}
      services={services}
      veterinarians={vetsRes.data ?? []}
      employees={employeesRes.data ?? []}
      clients={clientsRes.data ?? []}
      pets={petsRes.data ?? []}
      slots={slots.map((s) => ({
        startIso: s.start.toISOString(),
        endIso: s.end.toISOString(),
        status: s.status,
        appointment: s.appointment
          ? {
              id: s.appointment.id,
              status: s.appointment.status,
              pet_name: s.appointment.pet_name ?? null,
              service_name: s.appointment.service_name ?? null,
              professional_name: s.appointment.professional_name ?? null,
              tutor_name: s.appointment.tutor_name ?? null,
            }
          : null,
      }))}
    />
  );
}

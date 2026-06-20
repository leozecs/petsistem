import { redirect } from "next/navigation";
import { HorariosView, type CalendarSchedules } from "@/components/horarios/horarios-view";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";

export default async function HorariosPage() {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    redirect("/app");
  }
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const [calendarsRes, schedulesRes] = await Promise.all([
    supabase
      .from("calendars")
      .select("id, name, area, active")
      .eq("petshop_id", membership.petshopId)
      .eq("active", true)
      .order("area")
      .order("name"),
    supabase
      .from("schedules")
      .select("calendar_id, weekday, starts_at, ends_at, active")
      .eq("petshop_id", membership.petshopId),
  ]);

  const calendars = calendarsRes.data ?? [];
  const schedulesByCalendar = new Map<string, CalendarSchedules["entries"]>();

  for (const cal of calendars) {
    // Default entries when nothing explicit is in the DB. Matches DEFAULT_SCHEDULES.
    const defaults: CalendarSchedules["entries"] = [0, 1, 2, 3, 4, 5, 6].map((wd) => ({
      weekday: wd,
      open: wd !== 0,
      starts_at: "08:00",
      ends_at: "18:00",
    }));
    schedulesByCalendar.set(cal.id, defaults);
  }

  for (const s of schedulesRes.data ?? []) {
    const entries = schedulesByCalendar.get(s.calendar_id);
    if (!entries) continue;
    const idx = entries.findIndex((e) => e.weekday === s.weekday);
    if (idx === -1) continue;
    entries[idx] = {
      weekday: s.weekday,
      open: s.active,
      starts_at: s.starts_at.slice(0, 5),
      ends_at: s.ends_at.slice(0, 5),
    };
  }

  const data: CalendarSchedules[] = calendars.map((c) => ({
    calendar: c,
    entries: schedulesByCalendar.get(c.id) ?? [],
  }));

  return <HorariosView calendars={data} />;
}

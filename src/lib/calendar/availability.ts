import { addMinutes, parseTimeOfDayToMinutes, petshopWeekday, rangesOverlap } from "./time";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "finished"
  | "cancelled"
  | "no_show";

export type ScheduleInput = {
  weekday: number; // 0-6 (Sunday=0) in petshop TZ
  starts_at: string; // "HH:MM:SS" wall-clock in petshop TZ
  ends_at: string;
  active: boolean;
};

export type AppointmentInput = {
  id: string;
  starts_at: Date;
  ends_at: Date;
  status: AppointmentStatus;
  pet_name?: string | null;
  service_name?: string | null;
  professional_name?: string | null;
  tutor_name?: string | null;
};

export type Slot = {
  start: Date;
  end: Date;
  status: "free" | "occupied" | "outside_hours";
  appointment?: AppointmentInput;
};

/**
 * Default operating window for calendars that have not yet configured weekly
 * schedules. Mon-Sat 08:00-18:00, closed Sunday. Used as a fallback so the
 * appointment form always shows slots even before the tenant sets schedules.
 * Must stay in sync with the equivalent fallback in calendarios/actions.ts.
 */
export const DEFAULT_SCHEDULES: ScheduleInput[] = [1, 2, 3, 4, 5, 6].map((d) => ({
  weekday: d,
  starts_at: "08:00:00",
  ends_at: "18:00:00",
  active: true,
}));

export function effectiveSchedules(schedules: ScheduleInput[]): ScheduleInput[] {
  return schedules.length > 0 ? schedules : DEFAULT_SCHEDULES;
}

export type AvailabilityInput = {
  /** UTC instant of midnight petshop-TZ for the target date. */
  petshopMidnightUtc: Date;
  schedules: ScheduleInput[];
  appointments: AppointmentInput[];
  slotDurationMin: number;
  stepMin?: number;
};

const VALID_APPT_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "checked_in",
  "in_progress",
  "finished",
];

/**
 * Pure availability engine. Given midnight-of-target-date as a UTC instant
 * (already shifted to the petshop's timezone by the caller), the calendar's
 * weekly schedules, the day's appointments, and the desired slot duration,
 * produces every slot within the working windows marked as free or occupied.
 * Slots that an appointment fully encloses report that appointment in
 * `appointment`.
 *
 * The engine is timezone-aware via the `petshopMidnightUtc` contract: it never
 * calls `setHours`/`getDay` (which use the process-local TZ) and uses
 * petshop-anchored helpers from `./time`.
 */
export function computeAvailability(input: AvailabilityInput): Slot[] {
  const { petshopMidnightUtc, schedules, appointments, slotDurationMin, stepMin } = input;
  const step = stepMin ?? slotDurationMin;
  if (slotDurationMin <= 0 || step <= 0) return [];

  const weekday = petshopWeekday(petshopMidnightUtc);
  const todays = schedules.filter((s) => s.active && s.weekday === weekday);
  if (todays.length === 0) return [];

  const activeAppointments = appointments.filter((a) => VALID_APPT_STATUSES.includes(a.status));

  const slots: Slot[] = [];
  for (const win of todays) {
    const startMin = parseTimeOfDayToMinutes(win.starts_at);
    const endMin = parseTimeOfDayToMinutes(win.ends_at);
    if (endMin <= startMin) continue;
    const winStart = addMinutes(petshopMidnightUtc, startMin);
    const winEnd = addMinutes(petshopMidnightUtc, endMin);

    for (let cursor = winStart; cursor < winEnd; cursor = addMinutes(cursor, step)) {
      const slotEnd = addMinutes(cursor, slotDurationMin);
      if (slotEnd > winEnd) break;

      const overlapping = activeAppointments.find((a) =>
        rangesOverlap(cursor, slotEnd, a.starts_at, a.ends_at),
      );
      slots.push(
        overlapping
          ? { start: new Date(cursor), end: slotEnd, status: "occupied", appointment: overlapping }
          : { start: new Date(cursor), end: slotEnd, status: "free" },
      );
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function countFreeSlots(slots: Slot[]): number {
  return slots.reduce((n, s) => n + (s.status === "free" ? 1 : 0), 0);
}

export function countOccupiedSlots(slots: Slot[]): number {
  return slots.reduce((n, s) => n + (s.status === "occupied" ? 1 : 0), 0);
}

// Petshop fixed timezone. Brazil dropped DST in 2019, so a static -180 offset is
// safe for all current tenants. When per-tenant TZ is needed, replace this with
// a per-petshop setting and a proper TZ library.
export const PETSHOP_TZ_OFFSET_MIN = -180; // BRT = UTC-3
const TZ_OFFSET_MS = PETSHOP_TZ_OFFSET_MIN * 60_000;

export const WEEKDAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export function parseTimeOfDayToMinutes(hhmmss: string): number {
  const [h, m] = hhmmss.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Returns the UTC instant that corresponds to midnight in the petshop's
 * timezone for the given calendar date. With BRT (UTC-3), midnight BRT on
 * 2026-06-19 is 03:00 UTC.
 */
export function utcInstantOfPetshopMidnight(year: number, month0: number, day: number): Date {
  return new Date(Date.UTC(year, month0, day, 0, 0, 0, 0) - TZ_OFFSET_MS);
}

/**
 * Weekday (0-6) of the given UTC instant when interpreted as a petshop-local
 * wall-clock time. Use the *day's* midnight-UTC instant so DST-free Brazil is
 * deterministic.
 */
export function petshopWeekday(petshopMidnightUtc: Date): number {
  const wall = new Date(petshopMidnightUtc.getTime() + TZ_OFFSET_MS);
  return wall.getUTCDay();
}

/**
 * Returns the UTC instant of midnight-petshop-TZ for the calendar date that the
 * given UTC instant falls under, in petshop-local terms.
 */
export function petshopDateOf(instant: Date): { year: number; month0: number; day: number } {
  const wall = new Date(instant.getTime() + TZ_OFFSET_MS);
  return {
    year: wall.getUTCFullYear(),
    month0: wall.getUTCMonth(),
    day: wall.getUTCDate(),
  };
}

/**
 * Returns minutes-into-day in petshop-local terms for an instant.
 */
export function petshopMinutesIntoDay(instant: Date): number {
  const wall = new Date(instant.getTime() + TZ_OFFSET_MS);
  return wall.getUTCHours() * 60 + wall.getUTCMinutes();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function formatHHmmInPetshopTz(instant: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(instant);
}

export function formatLongDateInPetshopTz(instant: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(instant);
}

export function isSameDay(a: Date, b: Date): boolean {
  const da = petshopDateOf(a);
  const db = petshopDateOf(b);
  return da.year === db.year && da.month0 === db.month0 && da.day === db.day;
}

export function todayPetshopMidnightUtc(): Date {
  const { year, month0, day } = petshopDateOf(new Date());
  return utcInstantOfPetshopMidnight(year, month0, day);
}

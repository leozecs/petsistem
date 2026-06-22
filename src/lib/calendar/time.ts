import { DEFAULT_TIME_ZONE } from "@/lib/timezones";

export const WEEKDAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
type DateParts = { year: number; month0: number; day: number; hour: number; minute: number; second: number };

function zonedParts(instant: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month0: get("month") - 1, day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

function offsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  return Date.UTC(p.year, p.month0, p.day, p.hour, p.minute, p.second) - Math.floor(instant.getTime() / 1000) * 1000;
}

export function utcInstantOfPetshopDateTime(year: number, month0: number, day: number, hour = 0, minute = 0, timeZone = DEFAULT_TIME_ZONE): Date {
  const wallUtc = Date.UTC(year, month0, day, hour, minute, 0, 0);
  let result = new Date(wallUtc - offsetMs(new Date(wallUtc), timeZone));
  result = new Date(wallUtc - offsetMs(result, timeZone));
  return result;
}
export function utcInstantOfPetshopMidnight(year: number, month0: number, day: number, timeZone = DEFAULT_TIME_ZONE): Date { return utcInstantOfPetshopDateTime(year, month0, day, 0, 0, timeZone); }
export function parseTimeOfDayToMinutes(hhmmss: string): number { const [h, m] = hhmmss.split(":").map(Number); return (h ?? 0) * 60 + (m ?? 0); }
export function petshopDateOf(instant: Date, timeZone = DEFAULT_TIME_ZONE) { const p = zonedParts(instant, timeZone); return { year: p.year, month0: p.month0, day: p.day }; }
export function petshopMinutesIntoDay(instant: Date, timeZone = DEFAULT_TIME_ZONE): number { const p = zonedParts(instant, timeZone); return p.hour * 60 + p.minute; }
export function petshopWeekday(instant: Date, timeZone = DEFAULT_TIME_ZONE): number { const p = petshopDateOf(instant, timeZone); return new Date(Date.UTC(p.year, p.month0, p.day)).getUTCDay(); }
export function addMinutes(date: Date, minutes: number): Date { return new Date(date.getTime() + minutes * 60_000); }
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean { return aStart < bEnd && bStart < aEnd; }
export function formatHHmmInPetshopTz(instant: Date, timeZone = DEFAULT_TIME_ZONE): string { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(instant); }
export function formatLongDateInPetshopTz(instant: Date, timeZone = DEFAULT_TIME_ZONE): string { return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone }).format(instant); }
export function isSameDay(a: Date, b: Date, timeZone = DEFAULT_TIME_ZONE): boolean { const da = petshopDateOf(a, timeZone); const db = petshopDateOf(b, timeZone); return da.year === db.year && da.month0 === db.month0 && da.day === db.day; }
export function todayPetshopMidnightUtc(timeZone = DEFAULT_TIME_ZONE): Date { const p = petshopDateOf(new Date(), timeZone); return utcInstantOfPetshopMidnight(p.year, p.month0, p.day, timeZone); }
export function isPetshopToday(instant: Date, timeZone = DEFAULT_TIME_ZONE): boolean { return isSameDay(instant, new Date(), timeZone); }

import { describe, expect, it } from "vitest";
import { computeAvailability, effectiveSchedules } from "@/lib/calendar/availability";
import { addMinutes, utcInstantOfPetshopMidnight } from "@/lib/calendar/time";

describe("calendar availability", () => {
  it("does not inject default hours after tenant schedules exist", () => {
    const schedules = effectiveSchedules([
      { weekday: 1, starts_at: "08:00:00", ends_at: "23:00:00", active: true },
      { weekday: 2, starts_at: "00:00:00", ends_at: "00:00:01", active: false },
    ]);

    expect(schedules).toHaveLength(2);
    expect(schedules.some((schedule) => schedule.weekday === 3)).toBe(false);
  });

  it("uses the configured 15 minute grid through closing time", () => {
    const midnight = utcInstantOfPetshopMidnight(2026, 5, 29, "America/Sao_Paulo");
    const slots = computeAvailability({
      petshopMidnightUtc: midnight,
      schedules: [{ weekday: 1, starts_at: "08:00:00", ends_at: "23:00:00", active: true }],
      appointments: [],
      slotDurationMin: 15,
      stepMin: 15,
    });

    expect(slots).toHaveLength(60);
    expect(slots.at(-1)?.end.toISOString()).toBe(addMinutes(midnight, 23 * 60).toISOString());
  });
});

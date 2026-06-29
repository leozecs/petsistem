import { describe, expect, it } from "vitest";
import { databaseScheduleWindow } from "@/lib/calendar/schedule-time";

describe("databaseScheduleWindow", () => {
  it("formats an open schedule as valid Postgres times", () => {
    expect(databaseScheduleWindow("08:00", "18:00", true)).toEqual({
      startsAt: "08:00:00",
      endsAt: "18:00:00",
    });
  });

  it("keeps a closed schedule non-degenerate without creating a four-part time", () => {
    expect(databaseScheduleWindow("08:00", "18:00", false)).toEqual({
      startsAt: "08:00:00",
      endsAt: "08:00:01",
    });
  });
});

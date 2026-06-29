export function databaseScheduleWindow(startsAt: string, endsAt: string, open: boolean) {
  return {
    startsAt: `${startsAt}:00`,
    // Closed rows still need a valid non-degenerate range for the DB constraint.
    endsAt: open ? `${endsAt}:00` : `${startsAt}:01`,
  };
}

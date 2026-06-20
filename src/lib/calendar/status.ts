import type { AppointmentStatus } from "./availability";

/**
 * Linear status flow with 1-step undo. Terminal states (`cancelled`, `finished`)
 * cannot be advanced; `finished` can still be undone back to `in_progress` so
 * mistakes are recoverable. `cancelled` and `no_show` are intentionally terminal —
 * reopening should be a fresh appointment to preserve the audit trail.
 *
 * `pending` exists in the enum for backward compatibility with rows created
 * before status-flow rollout; new appointments start at `confirmed`.
 */

const FORWARD: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  pending: "confirmed",
  confirmed: "checked_in",
  checked_in: "in_progress",
  in_progress: "finished",
};

const BACKWARD: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  checked_in: "confirmed",
  in_progress: "checked_in",
  finished: "in_progress",
};

const TERMINAL: ReadonlySet<AppointmentStatus> = new Set(["cancelled", "no_show"]);

export function nextStatus(from: AppointmentStatus): AppointmentStatus | null {
  return FORWARD[from] ?? null;
}

export function prevStatus(from: AppointmentStatus): AppointmentStatus | null {
  return BACKWARD[from] ?? null;
}

export function isTerminal(s: AppointmentStatus): boolean {
  return TERMINAL.has(s);
}

/**
 * Server-side authoritative gate. Reject any transition that isn't either:
 *  - a forward step,
 *  - a one-step undo,
 *  - a move to `cancelled` or `no_show` from a non-terminal state (always allowed
 *    so operators can abort at any point before finish).
 */
export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  if (from === to) return false;
  if (nextStatus(from) === to) return true;
  if (prevStatus(from) === to) return true;
  if ((to === "cancelled" || to === "no_show") && !TERMINAL.has(from) && from !== "finished") {
    return true;
  }
  return false;
}

export function forwardLabel(from: AppointmentStatus): string | null {
  switch (from) {
    case "pending":
      return "Confirmar";
    case "confirmed":
      return "Check-in";
    case "checked_in":
      return "Iniciar atendimento";
    case "in_progress":
      return "Finalizar";
    default:
      return null;
  }
}

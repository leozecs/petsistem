"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";

const weekdayEntrySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  open: z.boolean(),
  starts_at: z.string().regex(/^\d{2}:\d{2}$/),
  ends_at: z.string().regex(/^\d{2}:\d{2}$/),
});

const saveSchedulesSchema = z.object({
  calendar_id: z.string().uuid(),
  entries: z.array(weekdayEntrySchema).length(7),
});

export type WeekdayEntry = z.infer<typeof weekdayEntrySchema>;

/**
 * Replace every schedule row for `calendar_id` with the provided 7-entry array
 * (one per weekday Sun..Sat). Closed days are stored as active=false rows so
 * the override sticks — without that, `effectiveSchedules` would re-apply the
 * default 08-18 for any weekday with no row.
 *
 * Validation:
 *  - Each open entry has end > start (rejects pathological 18-08 input).
 *  - Caller must be owner of the tenant.
 *  - Calendar must belong to the tenant (defense-in-depth on top of RLS).
 */
export async function saveSchedules(
  calendarId: string,
  entries: WeekdayEntry[],
): Promise<{ ok: boolean; error?: string }> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Sem permissão." };
  }

  const parsed = saveSchedulesSchema.safeParse({
    calendar_id: calendarId,
    entries,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Reject inverted windows on open days.
  for (const e of parsed.data.entries) {
    if (e.open && e.starts_at >= e.ends_at) {
      return {
        ok: false,
        error: `Dia ${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][e.weekday]}: hora final deve ser maior que a inicial.`,
      };
    }
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  // Confirm calendar belongs to this tenant.
  const { data: cal } = await supabase
    .from("calendars")
    .select("id")
    .eq("id", parsed.data.calendar_id)
    .eq("petshop_id", membership.petshopId)
    .maybeSingle();
  if (!cal) return { ok: false, error: "Calendário não pertence a esta loja." };

  // Replace strategy: delete all schedule rows for this calendar, then insert
  // the new set. Simpler than a 7-way diff and there's only one row per weekday
  // by current product rules.
  const { error: delErr } = await supabase
    .from("schedules")
    .delete()
    .eq("calendar_id", parsed.data.calendar_id)
    .eq("petshop_id", membership.petshopId);
  if (delErr) return { ok: false, error: delErr.message };

  const rows = parsed.data.entries.map((e) => ({
    petshop_id: membership.petshopId,
    calendar_id: parsed.data.calendar_id,
    weekday: e.weekday,
    starts_at: `${e.starts_at}:00`,
    ends_at: e.open ? `${e.ends_at}:00` : `${e.starts_at}:00:01`,
    active: e.open,
  }));

  // Closed-day rows need a non-degenerate range to satisfy the
  // `starts_at < ends_at` CHECK constraint; we use +1 second. The engine ignores
  // them via `active=false`, so the bogus end time never reaches the UI.
  const { error: insErr } = await supabase.from("schedules").insert(rows);
  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath("/app/configuracoes/horarios");
  revalidatePath("/app/calendarios");
  return { ok: true };
}

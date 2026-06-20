import { redirect } from "next/navigation";
import { CaixaView } from "@/components/caixa/caixa-view";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import {
  petshopDateOf,
  todayPetshopMidnightUtc,
  utcInstantOfPetshopMidnight,
  addMinutes,
} from "@/lib/calendar/time";

function parseDateParam(input: string | undefined): {
  midnight: Date;
  year: number;
  month0: number;
  day: number;
  iso: string;
} {
  let parts = petshopDateOf(todayPetshopMidnightUtc());
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    if (y && m && d) parts = { year: y, month0: m - 1, day: d };
  }
  return {
    midnight: utcInstantOfPetshopMidnight(parts.year, parts.month0, parts.day),
    year: parts.year,
    month0: parts.month0,
    day: parts.day,
    iso: `${parts.year}-${String(parts.month0 + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
  };
}

export default async function CaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) {
    redirect("/app");
  }
  const params = await searchParams;
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const day = parseDateParam(params.date);
  const dayStart = day.midnight;
  const dayEnd = addMinutes(dayStart, 24 * 60);

  // Charges keyed by the appointment's *start* in petshop TZ.
  // Embed nested appointment + service + client so we can show the row inline.
  const [chargesRes, expensesRes] = await Promise.all([
    supabase
      .from("appointment_charges")
      .select(
        "appointment_id, price_cents, payment_method, paid_at, notes, appointment:appointments!inner(id, starts_at, status, tutor_name, service:services(name), pet:pets(name), client:clients(name))",
      )
      .eq("petshop_id", membership.petshopId)
      .gte("appointment.starts_at", dayStart.toISOString())
      .lt("appointment.starts_at", dayEnd.toISOString())
      .order("appointment(starts_at)", { ascending: true }),
    supabase
      .from("expenses")
      .select(
        "id, description, amount_cents, occurred_on:due_date, payment_method, notes",
      )
      .eq("petshop_id", membership.petshopId)
      .eq("due_date", day.iso)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
  ]);

  type RawCharge = {
    appointment_id: string;
    price_cents: number;
    payment_method: string | null;
    paid_at: string | null;
    notes: string | null;
    appointment: {
      id: string;
      starts_at: string;
      status: string;
      tutor_name: string | null;
      service: { name: string } | null;
      pet: { name: string } | null;
      client: { name: string } | null;
    } | null;
  };

  const charges = ((chargesRes.data ?? []) as RawCharge[])
    .filter((c) => c.appointment !== null)
    .map((c) => ({
      appointmentId: c.appointment_id,
      priceCents: c.price_cents,
      paymentMethod: c.payment_method,
      paidAt: c.paid_at,
      startIso: c.appointment!.starts_at,
      status: c.appointment!.status,
      serviceName: c.appointment!.service?.name ?? null,
      petName: c.appointment!.pet?.name ?? null,
      tutorName: c.appointment!.tutor_name ?? c.appointment!.client?.name ?? null,
    }));

  const expenses = (expensesRes.data ?? []).map((e) => ({
    id: e.id,
    description: e.description,
    amountCents: e.amount_cents,
    occurredOn: e.occurred_on,
    paymentMethod: e.payment_method,
    notes: e.notes,
  }));

  return (
    <CaixaView
      dateIso={day.iso}
      charges={charges}
      expenses={expenses}
    />
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAvailability, effectiveSchedules } from "@/lib/calendar/availability";
import {
  addMinutes,
  petshopDateOf,
  utcInstantOfPetshopMidnight,
} from "@/lib/calendar/time";

export type BookingResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type SlotsResult =
  | { ok: true; slots: string[] /* ISO local "YYYY-MM-DDTHH:MM" */ }
  | { ok: false; error: string };

const slotsSchema = z.object({
  slug: z.string().trim().min(1),
  area: z.enum(["grooming", "veterinary"]),
  service_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Retorna anchors de 30-min livres no dia pra área da loja. Reutiliza o mesmo
 * pipeline do app (effectiveSchedules + computeAvailability), filtrando por
 * serviço pra garantir que o anchor cabe a duração necessária.
 */
export async function getPublicSlots(input: {
  slug: string;
  area: "grooming" | "veterinary";
  service_id: string;
  date: string;
}): Promise<SlotsResult> {
  const parsed = slotsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Servidor indisponível." };

  const { data: petshop } = await admin
    .from("petshops")
    .select("id, status")
    .or(`slug.eq.${parsed.data.slug},subdomain.eq.${parsed.data.slug}`)
    .is("deleted_at", null)
    .maybeSingle();
  if (!petshop) return { ok: false, error: "Loja não encontrada." };

  const { data: service } = await admin
    .from("services")
    .select("id, duration_minutes")
    .eq("id", parsed.data.service_id)
    .eq("petshop_id", petshop.id)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!service) return { ok: false, error: "Serviço não disponível." };

  const { data: calendar } = await admin
    .from("calendars")
    .select("id")
    .eq("petshop_id", petshop.id)
    .eq("area", parsed.data.area)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!calendar) return { ok: false, error: "Sem calendário configurado." };

  const [y, m, d] = parsed.data.date.split("-").map(Number);
  const petshopMidnight = utcInstantOfPetshopMidnight(y!, (m ?? 1) - 1, d ?? 1);
  const dayEnd = addMinutes(petshopMidnight, 24 * 60);

  const [{ data: schedRows }, { data: apptRows }] = await Promise.all([
    admin
      .from("schedules")
      .select("weekday, starts_at, ends_at, active")
      .eq("calendar_id", calendar.id)
      .eq("petshop_id", petshop.id)
      .eq("active", true),
    admin
      .from("appointments")
      .select("id, starts_at, ends_at, status")
      .eq("petshop_id", petshop.id)
      .eq("calendar_id", calendar.id)
      .gte("starts_at", addMinutes(petshopMidnight, -60).toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .is("deleted_at", null),
  ]);

  const schedules = effectiveSchedules(
    (schedRows ?? []).map((s) => ({
      weekday: s.weekday,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      active: s.active,
    })),
  );

  type AppStatus =
    | "pending"
    | "confirmed"
    | "checked_in"
    | "in_progress"
    | "finished"
    | "cancelled"
    | "no_show";

  const appointments = (apptRows ?? []).map((a) => ({
    id: a.id,
    starts_at: new Date(a.starts_at),
    ends_at: new Date(a.ends_at),
    status: a.status as AppStatus,
  }));

  // Gera grade de 30 min e filtra por consecutivos livres pra duração do serviço.
  const rawSlots = computeAvailability({
    petshopMidnightUtc: petshopMidnight,
    schedules,
    appointments,
    slotDurationMin: 30,
    stepMin: 30,
  });
  const slotsNeeded = Math.max(1, Math.ceil(service.duration_minutes / 30));
  const bookable: Date[] = [];
  for (let i = 0; i <= rawSlots.length - slotsNeeded; i++) {
    const window = rawSlots.slice(i, i + slotsNeeded);
    if (!window.every((s) => s.status === "free")) continue;
    let contiguous = true;
    for (let j = 0; j < window.length - 1; j++) {
      if (window[j]!.end.getTime() !== window[j + 1]!.start.getTime()) {
        contiguous = false;
        break;
      }
    }
    if (contiguous) bookable.push(window[0]!.start);
  }

  // Devolve como "YYYY-MM-DDTHH:MM" interpretado em petshop-TZ (BRT). O front
  // só exibe; o back reinterpreta o mesmo string na criação.
  const out = bookable.map((d) => {
    const parts = petshopDateOf(d);
    // Re-extract HH:MM em BRT a partir do instante UTC.
    const wall = new Date(d.getTime() - 180 * 60_000); // BRT = UTC-3
    const hh = String(wall.getUTCHours()).padStart(2, "0");
    const mm = String(wall.getUTCMinutes()).padStart(2, "0");
    const date = `${parts.year}-${String(parts.month0 + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    return `${date}T${hh}:${mm}`;
  });

  return { ok: true, slots: out };
}

const bookingSchema = z.object({
  slug: z.string().trim().min(1),
  area: z.enum(["grooming", "veterinary"]),
  service_id: z.string().uuid("Serviço obrigatório"),
  tutor_name: z.string().trim().min(2, "Informe o nome completo").max(120),
  whatsapp: z.string().trim().min(8, "Informe o WhatsApp").max(40),
  pet_name: z.string().trim().min(1, "Informe o nome do pet").max(80),
  species: z.string().trim().max(40).optional(),
  breed: z.string().trim().max(80).optional(),
  starts_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Horário inválido"),
  notes: z.string().trim().max(2000).optional(),
});

const SLOT_MINUTES = 30;

function digits(s: string): string {
  return s.replace(/\D+/g, "");
}

/**
 * Cria um agendamento público a partir da landing /loja/[slug]. Sem auth:
 * roda com service role pra burlar RLS. Find-or-create de tutor (por whatsapp
 * dentro do petshop) e pet (por nome + tutor + espécie). O agendamento entra
 * como `pending` — owner/atendente revisa no painel antes de confirmar.
 *
 * Validação:
 *  - service pertence à loja + área
 *  - calendário ativo na área
 *  - starts_at no formato local "YYYY-MM-DDTHH:MM"; transformamos pra ISO UTC
 *    interpretando o horário como petshop-TZ (BRT, -180min)
 */
export async function createPublicBooking(
  formData: FormData,
): Promise<BookingResult> {
  const parsed = bookingSchema.safeParse({
    slug: String(formData.get("slug") ?? ""),
    area: String(formData.get("area") ?? "grooming"),
    service_id: String(formData.get("service_id") ?? ""),
    tutor_name: String(formData.get("tutor_name") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    pet_name: String(formData.get("pet_name") ?? ""),
    species: String(formData.get("species") ?? "") || undefined,
    breed: String(formData.get("breed") ?? "") || undefined,
    starts_at: String(formData.get("starts_at") ?? ""),
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Dados inválidos.", fieldErrors };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Servidor indisponível, tente novamente." };

  // 1) Resolver loja por slug ou subdomain
  const { data: petshop } = await admin
    .from("petshops")
    .select("id, status")
    .or(`slug.eq.${parsed.data.slug},subdomain.eq.${parsed.data.slug}`)
    .is("deleted_at", null)
    .maybeSingle();
  if (!petshop) return { ok: false, error: "Loja não encontrada." };
  if (petshop.status !== "active") {
    return { ok: false, error: "Esta loja não está aceitando agendamentos no momento." };
  }

  // 2) Validar serviço (pertence à loja + área + ativo)
  const { data: service } = await admin
    .from("services")
    .select("id, area, duration_minutes, price_cents, name")
    .eq("id", parsed.data.service_id)
    .eq("petshop_id", petshop.id)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!service) return { ok: false, error: "Serviço não disponível." };
  if (service.area !== parsed.data.area) {
    return { ok: false, error: "Serviço fora da área selecionada." };
  }

  // 3) Resolver calendário (primeiro ativo da área)
  const { data: calendar } = await admin
    .from("calendars")
    .select("id")
    .eq("petshop_id", petshop.id)
    .eq("area", parsed.data.area)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!calendar) {
    return { ok: false, error: "Calendário não configurado pra essa área." };
  }

  // 4) Find-or-create tutor por whatsapp (somente dígitos)
  const phoneDigits = digits(parsed.data.whatsapp);
  let clientId: string | null = null;
  if (phoneDigits.length >= 8) {
    const { data: existing } = await admin
      .from("clients")
      .select("id, phone, whatsapp")
      .eq("petshop_id", petshop.id)
      .is("deleted_at", null)
      .or(`phone.ilike.%${phoneDigits}%,whatsapp.ilike.%${phoneDigits}%`)
      .limit(1)
      .maybeSingle();
    clientId = existing?.id ?? null;
  }
  if (!clientId) {
    const { data: createdClient, error: cliErr } = await admin
      .from("clients")
      .insert({
        petshop_id: petshop.id,
        name: parsed.data.tutor_name,
        phone: parsed.data.whatsapp,
        whatsapp: parsed.data.whatsapp,
      })
      .select("id")
      .single();
    if (cliErr || !createdClient) {
      return { ok: false, error: cliErr?.message ?? "Falha ao cadastrar tutor." };
    }
    clientId = createdClient.id;
  }

  // 5) Find-or-create pet por nome + client
  const { data: existingPet } = await admin
    .from("pets")
    .select("id")
    .eq("petshop_id", petshop.id)
    .eq("client_id", clientId)
    .ilike("name", parsed.data.pet_name)
    .is("deleted_at", null)
    .maybeSingle();
  let petId = existingPet?.id ?? null;
  if (!petId) {
    const { data: createdPet, error: petErr } = await admin
      .from("pets")
      .insert({
        petshop_id: petshop.id,
        client_id: clientId,
        name: parsed.data.pet_name,
        species: parsed.data.species || "dog",
        breed: parsed.data.breed ?? null,
      })
      .select("id")
      .single();
    if (petErr || !createdPet) {
      return { ok: false, error: petErr?.message ?? "Falha ao cadastrar pet." };
    }
    petId = createdPet.id;
  }

  // 6) Converter starts_at "YYYY-MM-DDTHH:MM" (interpretado como BRT) → UTC ISO
  // BRT = UTC-3 fixo, então UTC = local + 3h.
  const [datePart, timePart] = parsed.data.starts_at.split("T");
  const [y, m, d] = datePart!.split("-").map(Number);
  const [hh, mm] = timePart!.split(":").map(Number);
  const startUtc = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1, (hh ?? 0) + 3, mm ?? 0));
  const endUtc = new Date(startUtc.getTime() + SLOT_MINUTES * 60_000);

  // 7) Criar appointment (status pending pra revisão do petshop)
  const { data: appointment, error: apptErr } = await admin
    .from("appointments")
    .insert({
      petshop_id: petshop.id,
      calendar_id: calendar.id,
      service_id: service.id,
      client_id: clientId,
      pet_id: petId,
      starts_at: startUtc.toISOString(),
      ends_at: endUtc.toISOString(),
      tutor_name: parsed.data.tutor_name,
      tutor_phone: parsed.data.whatsapp,
      notes: parsed.data.notes ?? null,
      status: "pending",
    })
    .select("id")
    .single();
  if (apptErr || !appointment) {
    if (apptErr?.message?.includes("appointments_no_overlap")) {
      return {
        ok: false,
        error: "Esse horário acabou de ser ocupado por outro tutor. Escolha outro.",
      };
    }
    return { ok: false, error: apptErr?.message ?? "Falha ao criar agendamento." };
  }

  // 8) Charge automática
  await admin.from("appointment_charges").insert({
    appointment_id: appointment.id,
    petshop_id: petshop.id,
    price_cents: service.price_cents,
  });

  revalidatePath(`/loja/${parsed.data.slug}`);
  revalidatePath("/app/calendarios");
  revalidatePath("/app");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { petshopMinutesIntoDay, petshopWeekday, petshopDateOf, utcInstantOfPetshopMidnight, parseTimeOfDayToMinutes } from "@/lib/calendar/time";
import type { Database } from "@/lib/supabase/database.types";

type ServiceArea = Database["public"]["Enums"]["service_area"];
type MemberRole = Database["public"]["Enums"]["member_role"];

function allowedAreasForRole(role: MemberRole): ServiceArea[] {
  if (role === "owner") return ["grooming", "veterinary"];
  if (role === "attendant") return ["grooming"];
  if (role === "veterinarian") return ["veterinary"];
  return [];
}

const APPT_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "in_progress",
  "finished",
  "cancelled",
  "no_show",
] as const;

const appointmentSchema = z
  .object({
    id: z.string().uuid().optional().or(z.literal("")),
    calendar_id: z.string().uuid("Calendário obrigatório"),
    service_id: z.string().uuid("Serviço obrigatório"),
    client_id: z.string().uuid().optional().or(z.literal("")),
    pet_id: z.string().uuid().optional().or(z.literal("")),
    veterinarian_id: z.string().uuid().optional().or(z.literal("")),
    employee_id: z.string().uuid().optional().or(z.literal("")),
    starts_at: z.string().min(1, "Início obrigatório"),
    ends_at: z.string().min(1, "Fim obrigatório"),
    tutor_name: z.string().trim().optional(),
    tutor_phone: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine((v) => new Date(v.starts_at) < new Date(v.ends_at), {
    path: ["ends_at"],
    message: "Fim deve ser depois do início",
  });

export type AppointmentFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function saveAppointment(
  _prev: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant", "veterinarian"])) {
    return { ok: false, error: "Você não tem permissão para agendar." };
  }

  const raw = {
    id: String(formData.get("id") ?? "") || undefined,
    calendar_id: String(formData.get("calendar_id") ?? ""),
    service_id: String(formData.get("service_id") ?? ""),
    client_id: String(formData.get("client_id") ?? "") || undefined,
    pet_id: String(formData.get("pet_id") ?? "") || undefined,
    veterinarian_id: String(formData.get("veterinarian_id") ?? "") || undefined,
    employee_id: String(formData.get("employee_id") ?? "") || undefined,
    starts_at: String(formData.get("starts_at") ?? ""),
    ends_at: String(formData.get("ends_at") ?? ""),
    tutor_name: String(formData.get("tutor_name") ?? "") || undefined,
    tutor_phone: String(formData.get("tutor_phone") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  };

  const parsed = appointmentSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const allowed = allowedAreasForRole(membership.role);

  // Defense-in-depth: confirm the target calendar belongs to the active petshop AND
  // its area is within the caller's allowed areas. RLS lets any operational role
  // write to appointments in their tenant; this check enforces the per-role area
  // boundary that the UI advertises.
  const { data: targetCalendar, error: calLookupErr } = await supabase
    .from("calendars")
    .select("id, area")
    .eq("id", parsed.data.calendar_id)
    .eq("petshop_id", membership.petshopId)
    .maybeSingle();
  if (calLookupErr) return { ok: false, error: calLookupErr.message };
  if (!targetCalendar) return { ok: false, error: "Calendário não encontrado." };
  if (!allowed.includes(targetCalendar.area)) {
    return { ok: false, error: "Você não pode agendar nesse calendário." };
  }

  // Service must belong to the same petshop AND its area must match the calendar's
  // area (consistency invariant). This also blocks an attendant from picking a
  // veterinary service id even on a grooming calendar.
  const { data: targetService, error: svcLookupErr } = await supabase
    .from("services")
    .select("id, area, duration_minutes")
    .eq("id", parsed.data.service_id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null)
    .maybeSingle();
  if (svcLookupErr) return { ok: false, error: svcLookupErr.message };
  if (!targetService) return { ok: false, error: "Serviço não encontrado." };
  if (targetService.area !== targetCalendar.area) {
    return { ok: false, error: "Serviço incompatível com a área do calendário." };
  }

  // Defense-in-depth: ends_at - starts_at must equal service.duration_minutes.
  // The DB EXCLUDE constraint cannot enforce this; without this check a client
  // could submit a near-zero range to slip a ghost row between adjacent bookings.
  const startsAtDate = new Date(parsed.data.starts_at);
  const endsAtDate = new Date(parsed.data.ends_at);
  const actualDurationMin = Math.round((endsAtDate.getTime() - startsAtDate.getTime()) / 60_000);
  if (actualDurationMin !== targetService.duration_minutes) {
    return { ok: false, error: "Duração do agendamento não bate com o serviço selecionado." };
  }

  // Verify starts_at falls inside an active schedule window for this calendar's
  // weekday — otherwise out-of-hours ghost bookings can be created via direct POST.
  const startsAtParts = petshopDateOf(startsAtDate);
  const startsAtPetshopMidnight = utcInstantOfPetshopMidnight(
    startsAtParts.year,
    startsAtParts.month0,
    startsAtParts.day,
  );
  const weekday = petshopWeekday(startsAtPetshopMidnight);
  const startMinutes = petshopMinutesIntoDay(startsAtDate);
  const endMinutes = startMinutes + targetService.duration_minutes;

  const { data: schedules, error: schedErr } = await supabase
    .from("schedules")
    .select("starts_at, ends_at, active")
    .eq("calendar_id", parsed.data.calendar_id)
    .eq("petshop_id", membership.petshopId)
    .eq("weekday", weekday)
    .eq("active", true);
  if (schedErr) return { ok: false, error: schedErr.message };
  const fitsSchedule = (schedules ?? []).some((s) => {
    const sStart = parseTimeOfDayToMinutes(s.starts_at);
    const sEnd = parseTimeOfDayToMinutes(s.ends_at);
    return sStart <= startMinutes && endMinutes <= sEnd;
  });
  if (!fitsSchedule) {
    return { ok: false, error: "Horário fora da janela de funcionamento do calendário." };
  }

  // Confirm any provided client/pet belong to this petshop and to each other.
  if (parsed.data.client_id) {
    const { data: client, error: cliErr } = await supabase
      .from("clients")
      .select("id")
      .eq("id", parsed.data.client_id)
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null)
      .maybeSingle();
    if (cliErr) return { ok: false, error: cliErr.message };
    if (!client) return { ok: false, error: "Tutor não encontrado nesta loja." };
  }
  if (parsed.data.pet_id) {
    const { data: pet, error: petErr } = await supabase
      .from("pets")
      .select("id, client_id")
      .eq("id", parsed.data.pet_id)
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null)
      .maybeSingle();
    if (petErr) return { ok: false, error: petErr.message };
    if (!pet) return { ok: false, error: "Pet não encontrado nesta loja." };
    if (parsed.data.client_id && pet.client_id !== parsed.data.client_id) {
      return { ok: false, error: "O pet não pertence ao tutor selecionado." };
    }
  }

  // Confirm professional (vet or employee) belongs to this petshop.
  if (parsed.data.veterinarian_id) {
    const { data: vet } = await supabase
      .from("veterinarians")
      .select("id")
      .eq("id", parsed.data.veterinarian_id)
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!vet) return { ok: false, error: "Veterinário não encontrado." };
  }
  if (parsed.data.employee_id) {
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("id", parsed.data.employee_id)
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!emp) return { ok: false, error: "Funcionário não encontrado." };
  }

  const payload = {
    petshop_id: membership.petshopId,
    calendar_id: parsed.data.calendar_id,
    service_id: parsed.data.service_id,
    client_id: parsed.data.client_id || null,
    pet_id: parsed.data.pet_id || null,
    veterinarian_id: parsed.data.veterinarian_id || null,
    employee_id: parsed.data.employee_id || null,
    starts_at: new Date(parsed.data.starts_at).toISOString(),
    ends_at: new Date(parsed.data.ends_at).toISOString(),
    tutor_name: parsed.data.tutor_name ?? null,
    tutor_phone: parsed.data.tutor_phone ?? null,
    notes: parsed.data.notes ?? null,
  };

  if (parsed.data.id) {
    const { error } = await supabase
      .from("appointments")
      .update({ ...payload, updated_by: session.user.id })
      .eq("id", parsed.data.id)
      .eq("petshop_id", membership.petshopId);
    if (error) return { ok: false, error: friendlyError(error.message) };
  } else {
    const { error } = await supabase
      .from("appointments")
      .insert({ ...payload, status: "pending", created_by: session.user.id });
    if (error) return { ok: false, error: friendlyError(error.message) };
  }

  revalidatePath("/app/calendarios");
  return { ok: true };
}

const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(APPT_STATUSES),
});

export async function updateAppointmentStatus(
  id: string,
  status: (typeof APPT_STATUSES)[number],
): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant", "veterinarian"])) {
    return { ok: false, error: "Sem permissão." };
  }
  const parsed = updateStatusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  // Defense-in-depth: load the appointment's calendar.area and confirm it is in
  // the caller's allowed areas. Without this, an attendant could cancel any
  // veterinary appointment in their tenant just by knowing the UUID.
  const allowed = allowedAreasForRole(membership.role);
  const { data: appt, error: lookupErr } = await supabase
    .from("appointments")
    .select("id, calendar:calendars!inner(area)")
    .eq("id", parsed.data.id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null)
    .maybeSingle();
  if (lookupErr) return { ok: false, error: lookupErr.message };
  if (!appt) return { ok: false, error: "Agendamento não encontrado." };
  const apptArea = (appt.calendar as { area: ServiceArea } | null)?.area;
  if (!apptArea || !allowed.includes(apptArea)) {
    return { ok: false, error: "Você não pode alterar esse agendamento." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: parsed.data.status, updated_by: session.user.id })
    .eq("id", parsed.data.id)
    .eq("petshop_id", membership.petshopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/calendarios");
  return { ok: true };
}

export async function cancelAppointment(id: string): Promise<{ ok: boolean; error?: string }> {
  return updateAppointmentStatus(id, "cancelled");
}

function friendlyError(raw: string): string {
  if (raw.includes("appointments_no_overlap")) {
    return "Esse horário foi ocupado por outro agendamento. Atualize a página e escolha outro.";
  }
  return raw;
}

const createClientSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  phone: z.string().trim().max(40).optional(),
});

export type CreateEntityResult =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string };

/**
 * Inline-create a client (tutor) from the appointment form. Reuses an existing
 * client of the same name (case-insensitive) within the tenant to avoid duplicates.
 * Security: rejects unless the caller has an operational role on the active tenant.
 */
export async function createClientInline(
  name: string,
  phone?: string,
): Promise<CreateEntityResult> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant", "veterinarian"])) {
    return { ok: false, error: "Sem permissão." };
  }
  const parsed = createClientSchema.safeParse({ name, phone });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const trimmed = parsed.data.name.trim();
  const { data: existing } = await supabase
    .from("clients")
    .select("id, name")
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null)
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) {
    revalidatePath("/app/calendarios");
    return { ok: true, id: existing.id, name: existing.name };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      petshop_id: membership.petshopId,
      name: trimmed,
      phone: parsed.data.phone?.trim() || "",
      created_by: session.user.id,
    })
    .select("id, name")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/calendarios");
  return { ok: true, id: data.id, name: data.name };
}

const createPetSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(80),
  client_id: z.string().uuid("Tutor obrigatório"),
  species: z.string().trim().min(1).max(40).default("dog"),
});

/**
 * Inline-create a pet linked to a tutor (client) from the appointment form.
 * Reuses an existing pet of the same name under that client (case-insensitive).
 * Defense-in-depth: verifies the client belongs to the caller's petshop before insert.
 */
export async function createPetInline(
  name: string,
  clientId: string,
  species = "dog",
): Promise<CreateEntityResult> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant", "veterinarian"])) {
    return { ok: false, error: "Sem permissão." };
  }
  const parsed = createPetSchema.safeParse({ name, client_id: clientId, species });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", parsed.data.client_id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!client) return { ok: false, error: "Tutor não pertence a esta loja." };

  const trimmed = parsed.data.name.trim();
  const { data: existing } = await supabase
    .from("pets")
    .select("id, name")
    .eq("petshop_id", membership.petshopId)
    .eq("client_id", parsed.data.client_id)
    .is("deleted_at", null)
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) {
    revalidatePath("/app/calendarios");
    return { ok: true, id: existing.id, name: existing.name };
  }

  const { data, error } = await supabase
    .from("pets")
    .insert({
      petshop_id: membership.petshopId,
      client_id: parsed.data.client_id,
      name: trimmed,
      species: parsed.data.species,
      created_by: session.user.id,
    })
    .select("id, name")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/calendarios");
  return { ok: true, id: data.id, name: data.name };
}

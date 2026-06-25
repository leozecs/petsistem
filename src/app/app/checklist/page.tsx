import { redirect } from "next/navigation";
import { ChecklistDayView, type ChecklistCard } from "@/components/checklist/checklist-day-view";
import type { ChecklistTemplate } from "@/components/checklist/checklist-config-dialog";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  petshopDateOf,
  todayPetshopMidnightUtc,
  utcInstantOfPetshopMidnight,
} from "@/lib/calendar/time";
import type { Database } from "@/lib/supabase/database.types";

type ServiceArea = Database["public"]["Enums"]["service_area"];

function allowedAreas(role: string): ServiceArea[] {
  if (role === "owner") return ["grooming", "veterinary"];
  if (role === "attendant") return ["grooming"];
  if (role === "veterinarian") return ["veterinary"];
  return [];
}

const SIGNED_URL_TTL_SECONDS = 60 * 30; // 30 min — refresca a cada reload

export default async function ChecklistPage() {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant", "veterinarian"])) {
    redirect("/app");
  }

  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const areas = allowedAreas(membership.role);
  const canConfigure = hasRole(membership, ["owner", "attendant"]);

  const [{ data: configurableServices }, { data: configurableSteps }] = await Promise.all([
    supabase.from("services").select("id, name, area").eq("petshop_id", membership.petshopId).in("area", areas).eq("active", true).is("deleted_at", null).order("name"),
    supabase.from("checklist_steps").select("id, service_id, label, position").eq("petshop_id", membership.petshopId).eq("active", true).not("service_id", "is", null).order("position"),
  ]);
  const templates: ChecklistTemplate[] = (configurableServices ?? []).map((service) => ({
    serviceId: service.id,
    serviceName: service.name,
    steps: (configurableSteps ?? []).filter((step) => step.service_id === service.id).map((step) => ({ id: step.id, label: step.label, position: step.position })),
  }));

  // Janela hoje em TZ petshop
  const timeZone = membership.petshop.timezone;
  const today = petshopDateOf(todayPetshopMidnightUtc(timeZone), timeZone);
  const startTs = utcInstantOfPetshopMidnight(today.year, today.month0, today.day, timeZone).toISOString();
  const endTs = utcInstantOfPetshopMidnight(today.year, today.month0, today.day + 1, timeZone).toISOString();

  // 1. Appointments hoje na área do role com status relevante
  const { data: apptsRaw } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, tracking_slug, tutor_name, pet:pets(name, species), service:services(id, name, area), client:clients(name, phone, whatsapp), calendar:calendars!inner(area)",
    )
    .eq("petshop_id", membership.petshopId)
    .gte("starts_at", startTs)
    .lt("starts_at", endTs)
    .in("status", ["confirmed", "checked_in", "in_progress"])
    .is("deleted_at", null)
    .order("starts_at");

  type RawAppt = {
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    tracking_slug: string | null;
    tutor_name: string | null;
    pet: { name: string; species: string } | null;
    service: { id: string; name: string; area: ServiceArea } | null;
    client: { name: string; phone: string; whatsapp: string | null } | null;
    calendar: { area: ServiceArea } | null;
  };

  const allAppts = ((apptsRaw ?? []) as RawAppt[]).filter(
    (a) => a.calendar && areas.includes(a.calendar.area),
  );

  if (allAppts.length === 0) {
    return <ChecklistDayView cards={[]} templates={templates} canConfigure={canConfigure} timeZone={timeZone} />;
  }

  const serviceIds = Array.from(
    new Set(allAppts.map((a) => a.service?.id).filter((v): v is string => !!v)),
  );
  const apptIds = allAppts.map((a) => a.id);

  // 2. Steps: por serviço, fallback global (service_id IS NULL)
  const stepsByService = new Map<string, Array<{ id: string; label: string; position: number }>>();
  const globalSteps: Array<{ id: string; label: string; position: number }> = [];

  if (serviceIds.length > 0) {
    const { data: serviceSteps } = await supabase
      .from("checklist_steps")
      .select("id, label, position, service_id")
      .eq("petshop_id", membership.petshopId)
      .eq("active", true)
      .in("service_id", serviceIds)
      .order("position");
    for (const s of serviceSteps ?? []) {
      if (!s.service_id) continue;
      const arr = stepsByService.get(s.service_id) ?? [];
      arr.push({ id: s.id, label: s.label, position: s.position });
      stepsByService.set(s.service_id, arr);
    }
  }

  const { data: globalRows } = await supabase
    .from("checklist_steps")
    .select("id, label, position")
    .eq("petshop_id", membership.petshopId)
    .eq("active", true)
    .is("service_id", null)
    .order("position");
  for (const g of globalRows ?? []) {
    globalSteps.push({ id: g.id, label: g.label, position: g.position });
  }

  // 3. Checklists rows (etapas marcadas) + 4. Fotos
  const { data: checklistsRows } = await supabase
    .from("checklists")
    .select("id, appointment_id, step_id, completed_at, notes")
    .eq("petshop_id", membership.petshopId)
    .in("appointment_id", apptIds);

  const checklistIds = (checklistsRows ?? []).map((c) => c.id);

  let photosRows: Array<{ id: string; checklist_id: string; photo_path: string }> = [];
  if (checklistIds.length > 0) {
    const { data: p } = await supabase
      .from("appointment_step_photos")
      .select("id, checklist_id, photo_path")
      .in("checklist_id", checklistIds)
      .order("created_at");
    photosRows = p ?? [];
  }

  // 5. Signed URLs em lote
  const admin = createAdminClient();
  const photoIdsByPath = new Map<string, string>();
  for (const ph of photosRows) photoIdsByPath.set(ph.photo_path, ph.id);
  const signedByPath = new Map<string, string>();
  if (admin && photosRows.length > 0) {
    const paths = photosRows.map((p) => p.photo_path);
    const { data: signed } = await admin.storage
      .from("appointment-photos")
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
    }
  }

  // Bind por appointment
  const cards: ChecklistCard[] = allAppts.map((a) => {
    const steps = (a.service?.id ? stepsByService.get(a.service.id) : null) ?? globalSteps;
    const checklistsForAppt = (checklistsRows ?? []).filter((c) => c.appointment_id === a.id);

    return {
      appointmentId: a.id,
      petName: a.pet?.name ?? "Pet sem nome",
      serviceName: a.service?.name ?? "Serviço",
      area: a.service?.area ?? "grooming",
      status: a.status as ChecklistCard["status"],
      startIso: a.starts_at,
      trackingSlug: a.tracking_slug,
      tutorWhatsapp: a.client?.whatsapp ?? a.client?.phone ?? null,
      tutorName: a.tutor_name ?? a.client?.name ?? null,
      steps: steps.map((s) => {
        const row = checklistsForAppt.find((c) => c.step_id === s.id);
        const photos = row
          ? photosRows
              .filter((p) => p.checklist_id === row.id)
              .map((p) => ({
                id: p.id,
                url: signedByPath.get(p.photo_path) ?? null,
              }))
              .filter((p) => p.url)
          : [];
        return {
          stepId: s.id,
          label: s.label,
          done: !!row?.completed_at,
          photos: photos as Array<{ id: string; url: string }>,
        };
      }),
    };
  });

  return <ChecklistDayView cards={cards} templates={templates} canConfigure={canConfigure} timeZone={timeZone} />;
}

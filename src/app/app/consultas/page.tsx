import { redirect } from "next/navigation";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import { ConsultasView, type ClinicalPet } from "@/components/consultas/consultas-view";
import { isRouteAllowedByPlan } from "@/lib/billing/plan-rules";

export default async function ConsultasPage() {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "veterinarian"])) redirect("/app");
  if (!isRouteAllowedByPlan(membership.petshop.planName, "/app/consultas")) {
    redirect("/app?error=plan-gated");
  }
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const [{ data: pets }, { data: entries }, { data: appointments }] = await Promise.all([
    supabase.from("pets").select("id, name, species, breed, sex, weight_kg, age_label, notes, client:clients(name, whatsapp, phone)").eq("petshop_id", membership.petshopId).is("deleted_at", null).order("name").limit(500),
    supabase.from("pet_clinical_entries").select("id, pet_id, title, notes, created_at, veterinarian:veterinarians(name)").eq("petshop_id", membership.petshopId).order("created_at", { ascending: false }).limit(1000),
    supabase.from("appointments").select("id, pet_id, starts_at, status, service:services(name, area), record:appointment_records(chief_complaint, diagnosis, plan)").eq("petshop_id", membership.petshopId).not("pet_id", "is", null).is("deleted_at", null).order("starts_at", { ascending: false }).limit(1500),
  ]);

  const entriesByPet = new Map<string, NonNullable<typeof entries>>();
  for (const entry of entries ?? []) {
    const petEntries = entriesByPet.get(entry.pet_id) ?? [];
    petEntries.push(entry);
    entriesByPet.set(entry.pet_id, petEntries);
  }

  const appointmentsByPet = new Map<string, NonNullable<typeof appointments>>();
  for (const appointment of appointments ?? []) {
    if (!appointment.pet_id) continue;
    const petAppointments = appointmentsByPet.get(appointment.pet_id) ?? [];
    petAppointments.push(appointment);
    appointmentsByPet.set(appointment.pet_id, petAppointments);
  }

  const rows: ClinicalPet[] = (pets ?? []).map((pet) => {
    const client = Array.isArray(pet.client) ? pet.client[0] : pet.client;
    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      sex: pet.sex,
      weightKg: pet.weight_kg,
      ageLabel: pet.age_label,
      notes: pet.notes,
      tutorName: client?.name ?? null,
      tutorWhatsapp: client?.whatsapp ?? client?.phone ?? null,
      entries: (entriesByPet.get(pet.id) ?? []).map((entry) => ({
        id: entry.id,
        title: entry.title,
        notes: entry.notes,
        createdAt: entry.created_at,
        veterinarianName: Array.isArray(entry.veterinarian) ? entry.veterinarian[0]?.name ?? null : entry.veterinarian?.name ?? null,
      })),
      appointments: (appointmentsByPet.get(pet.id) ?? []).map((appointment) => {
        const service = Array.isArray(appointment.service) ? appointment.service[0] : appointment.service;
        const record = Array.isArray(appointment.record) ? appointment.record[0] : appointment.record;
        return {
          id: appointment.id,
          startsAt: appointment.starts_at,
          status: appointment.status,
          serviceName: service?.name ?? "Atendimento",
          area: service?.area ?? "grooming",
          diagnosis: record?.diagnosis ?? null,
          complaint: record?.chief_complaint ?? null,
          plan: record?.plan ?? null,
        };
      }),
    };
  });
  return <ConsultasView pets={rows} />;
}

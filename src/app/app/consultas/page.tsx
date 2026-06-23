import { redirect } from "next/navigation";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import { ConsultasView, type ClinicalPet } from "@/components/consultas/consultas-view";

export default async function ConsultasPage() {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "veterinarian"])) redirect("/app");
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const [{ data: pets }, { data: entries }] = await Promise.all([
    supabase.from("pets").select("id, name, species, breed, client:clients(name)").eq("petshop_id", membership.petshopId).is("deleted_at", null).order("name").limit(500),
    supabase.from("pet_clinical_entries").select("id, pet_id, title, notes, created_at, veterinarian:veterinarians(name)").eq("petshop_id", membership.petshopId).order("created_at", { ascending: false }).limit(1000),
  ]);

  const rows: ClinicalPet[] = (pets ?? []).map((pet) => ({
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    tutorName: Array.isArray(pet.client) ? pet.client[0]?.name ?? null : pet.client?.name ?? null,
    entries: (entries ?? []).filter((entry) => entry.pet_id === pet.id).map((entry) => ({
      id: entry.id,
      title: entry.title,
      notes: entry.notes,
      createdAt: entry.created_at,
      veterinarianName: Array.isArray(entry.veterinarian) ? entry.veterinarian[0]?.name ?? null : entry.veterinarian?.name ?? null,
    })),
  }));
  return <ConsultasView pets={rows} />;
}

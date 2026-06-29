import { requireTenant } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import { petshopDateOf, todayPetshopMidnightUtc, utcInstantOfPetshopMidnight } from "@/lib/calendar/time";
import { AtendimentosView, type AtendimentoCard } from "@/components/atendimentos/atendimentos-view";
import type { Database } from "@/lib/supabase/database.types";

type Area = Database["public"]["Enums"]["service_area"];
const areasForRole = (role: string): Area[] => role === "owner" ? ["grooming", "veterinary"] : role === "veterinarian" ? ["veterinary"] : ["grooming"];

export default async function AtendimentosPage() {
  const { membership } = await requireTenant();
  const supabase = await createClient();
  if (!supabase) return <AtendimentosView cards={[]} />;
  const timezone = membership.petshop.timezone;
  const today = petshopDateOf(todayPetshopMidnightUtc(timezone), timezone);
  const start = utcInstantOfPetshopMidnight(today.year, today.month0, today.day, timezone).toISOString();
  const end = utcInstantOfPetshopMidnight(today.year, today.month0, today.day + 1, timezone).toISOString();
  const { data } = await supabase.from("appointments").select("id, starts_at, status, tracking_slug, tutor_name, tutor_phone, service:services(name, area), pet:pets(name), client:clients(name, phone, whatsapp)").eq("petshop_id", membership.petshopId).gte("starts_at", start).lt("starts_at", end).is("deleted_at", null).not("status", "in", '(cancelled,no_show)').order("starts_at");
  const allowed = areasForRole(membership.role);
  const cards: AtendimentoCard[] = (data ?? []).filter((row) => row.service && allowed.includes(row.service.area)).map((row) => ({
    id: row.id,
    startsAt: row.starts_at,
    status: row.status,
    trackingSlug: row.tracking_slug,
    serviceName: row.service?.name ?? "Serviço",
    area: row.service?.area ?? "grooming",
    petName: row.pet?.name ?? "Pet",
    tutorName: row.tutor_name ?? row.client?.name ?? "Tutor",
    whatsapp: row.client?.whatsapp ?? row.client?.phone ?? row.tutor_phone,
  }));
  return <AtendimentosView cards={cards} />;
}

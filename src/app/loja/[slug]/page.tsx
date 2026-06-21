import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingPage, type BookingService } from "@/components/booking/booking-page";
import { createAdminClient } from "@/lib/supabase/admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminClient();
  if (!admin) return { title: "Agendamento" };
  const { data: petshop } = await admin
    .from("petshops")
    .select("name")
    .or(`slug.eq.${slug},subdomain.eq.${slug}`)
    .is("deleted_at", null)
    .maybeSingle();
  return {
    title: petshop?.name ? `${petshop.name} · Agendar` : "Agendar",
  };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();
  if (!admin) notFound();

  const { data: petshop } = await admin
    .from("petshops")
    .select(
      "id, name, slug, subdomain, status, primary_color, address, phone, logo_path",
    )
    .or(`slug.eq.${slug},subdomain.eq.${slug}`)
    .is("deleted_at", null)
    .maybeSingle();
  if (!petshop) notFound();

  let logoUrl: string | null = null;
  if (petshop.logo_path) {
    const { data: pub } = admin.storage
      .from("petshop-logos")
      .getPublicUrl(petshop.logo_path);
    logoUrl = pub.publicUrl;
  }

  const { data: servicesData } = await admin
    .from("services")
    .select("id, name, area, duration_minutes, price_cents, description")
    .eq("petshop_id", petshop.id)
    .eq("active", true)
    .is("deleted_at", null)
    .order("area")
    .order("name");

  const services: BookingService[] = (servicesData ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    area: s.area as "grooming" | "veterinary",
    durationMinutes: s.duration_minutes,
    priceCents: s.price_cents,
    description: s.description ?? null,
  }));

  return (
    <BookingPage
      slug={slug}
      storeName={petshop.name}
      storeStatus={petshop.status}
      primaryColor={petshop.primary_color}
      services={services}
      address={petshop.address ?? null}
      phone={petshop.phone ?? null}
      logoUrl={logoUrl}
    />
  );
}

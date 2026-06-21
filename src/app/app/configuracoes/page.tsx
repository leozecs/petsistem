import { redirect } from "next/navigation";
import { ConfiguracoesView } from "@/components/configuracoes/configuracoes-view";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "petsistem.com.br";

export default async function ConfiguracoesPage() {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    redirect("/app");
  }

  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const { data: petshop } = await supabase
    .from("petshops")
    .select(
      "id, name, legal_name, address, phone, whatsapp, email, primary_color, subdomain, slug, logo_path",
    )
    .eq("id", membership.petshopId)
    .maybeSingle();
  if (!petshop) redirect("/app");

  let logoUrl: string | null = null;
  if (petshop.logo_path) {
    const admin = createAdminClient();
    if (admin) {
      const { data } = admin.storage
        .from("petshop-logos")
        .getPublicUrl(petshop.logo_path);
      logoUrl = data.publicUrl;
    }
  }

  return (
    <ConfiguracoesView
      petshop={{
        id: petshop.id,
        name: petshop.name,
        legalName: petshop.legal_name ?? "",
        address: petshop.address ?? "",
        phone: petshop.phone ?? "",
        whatsapp: petshop.whatsapp ?? "",
        email: petshop.email ?? "",
        primaryColor: petshop.primary_color,
        subdomain: petshop.subdomain,
        logoUrl,
      }}
      rootDomain={ROOT_DOMAIN}
    />
  );
}

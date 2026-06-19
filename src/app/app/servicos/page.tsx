import { ServicosManager } from "@/components/servicos/servicos-manager";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";

export default async function ServicosPage() {
  const { membership } = await requireTenant();
  const supabase = await createClient();

  const { data } = supabase
    ? await supabase
        .from("services")
        .select("*")
        .eq("petshop_id", membership.petshopId)
        .is("deleted_at", null)
        .order("area", { ascending: true })
        .order("name", { ascending: true })
    : { data: [] };

  return (
    <ServicosManager
      initialServices={data ?? []}
      canManage={hasRole(membership, ["owner"])}
    />
  );
}

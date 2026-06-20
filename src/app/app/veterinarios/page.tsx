import { redirect } from "next/navigation";
import { VeterinariosManager } from "@/components/veterinarios/veterinarios-manager";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";

export default async function VeterinariosPage() {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    redirect("/app");
  }
  const supabase = await createClient();

  const { data } = supabase
    ? await supabase
        .from("veterinarians")
        .select("*")
        .eq("petshop_id", membership.petshopId)
        .is("deleted_at", null)
        .order("name", { ascending: true })
    : { data: [] };

  return <VeterinariosManager initialVets={data ?? []} />;
}

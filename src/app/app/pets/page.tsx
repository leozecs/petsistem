import { PetsManager } from "@/components/pets/pets-manager";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";

export default async function PetsPage() {
  const { membership } = await requireTenant();
  const supabase = await createClient();

  if (!supabase) {
    return <PetsManager initialPets={[]} clientsForSelect={[]} canManage={false} />;
  }

  const [petsResult, clientsResult] = await Promise.all([
    supabase
      .from("pets")
      .select("*, client:clients(id, name)")
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("clients")
      .select("id, name")
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  return (
    <PetsManager
      initialPets={petsResult.data ?? []}
      clientsForSelect={clientsResult.data ?? []}
      canManage={hasRole(membership, ["owner", "attendant"])}
    />
  );
}

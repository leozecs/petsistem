import {
  ClientesPetsManager,
  type ClientWithPets,
} from "@/components/clientes/clientes-pets-manager";
import { hasRole, requireTenant } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type PetRow = Database["public"]["Tables"]["pets"]["Row"];

export default async function ClientesPage() {
  const { membership } = await requireTenant();
  const supabase = await createClient();

  if (!supabase) {
    return <ClientesPetsManager clients={[]} canManage={false} />;
  }

  // Single round-trip: pull clients + their pets via an embed.
  const { data } = await supabase
    .from("clients")
    .select("*, pets:pets(*)")
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  // The pets embed includes soft-deleted rows by default; filter client-side.
  const clients: ClientWithPets[] = (data ?? []).map((c) => ({
    ...c,
    pets: ((c.pets as PetRow[] | null) ?? [])
      .filter((p) => p.deleted_at === null)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <ClientesPetsManager
      clients={clients}
      canManage={hasRole(membership, ["owner", "attendant"])}
    />
  );
}

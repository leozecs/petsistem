import { redirect } from "next/navigation";
import { CategoriasView, type CategoryRow } from "@/components/categorias/categorias-view";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";

export default async function CategoriasPage() {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    redirect("/app");
  }

  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const { data } = await supabase
    .from("categories")
    .select("id, kind, name, description, position, active")
    .eq("petshop_id", membership.petshopId)
    .order("kind")
    .order("position")
    .order("name");

  const categories: CategoryRow[] = (data ?? []).map((c) => ({
    id: c.id,
    kind: c.kind as "revenue" | "expense",
    name: c.name,
    description: c.description ?? "",
    position: c.position,
    active: c.active,
  }));

  return <CategoriasView initialCategories={categories} />;
}

import { redirect } from "next/navigation";
import { FuncionariosManager } from "@/components/funcionarios/funcionarios-manager";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";

export default async function FuncionariosPage() {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    redirect("/app");
  }
  const supabase = await createClient();

  const { data } = supabase
    ? await supabase
        .from("employees")
        .select("*")
        .eq("petshop_id", membership.petshopId)
        .is("deleted_at", null)
        .order("name", { ascending: true })
    : { data: [] };

  return <FuncionariosManager initialEmployees={data ?? []} />;
}

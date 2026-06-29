import { redirect } from "next/navigation";
import { FuncionariosManager } from "@/components/funcionarios/funcionarios-manager";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";

export default async function FuncionariosPage({
  searchParams,
}: {
  searchParams?: Promise<{ perfil?: string }>;
}) {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    redirect("/app");
  }
  const supabase = await createClient();
  const params = await searchParams;

  const [{ data: employees }, { data: veterinarians }] = supabase
    ? await Promise.all([
        supabase
          .from("employees")
          .select("*")
          .eq("petshop_id", membership.petshopId)
          .is("deleted_at", null)
          .order("name", { ascending: true }),
        supabase
          .from("veterinarians")
          .select("*")
          .eq("petshop_id", membership.petshopId)
          .is("deleted_at", null)
          .order("name", { ascending: true }),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <FuncionariosManager
      initialEmployees={employees ?? []}
      initialVeterinarians={veterinarians ?? []}
      initialProfile={params?.perfil === "veterinarian" ? "veterinarian" : "attendant"}
    />
  );
}

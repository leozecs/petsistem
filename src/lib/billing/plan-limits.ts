import { createAdminClient } from "@/lib/supabase/admin";

export type PlanLimits = {
  planName: string;
  maxUsers: number;
  allowsVeterinarian: boolean;
  currentUsers: number;
};

/**
 * Resolve os limites efetivos do plano da loja + uso atual.
 *
 * Lookup: petshops.plan_id → plans (preferido). Caso o tenant tenha sido criado
 * antes do seed dos planos (plan_id null), usa um fallback permissivo
 * (Profissional) pra não travar a operação. Tela de Assinaturas força o admin
 * a definir um plano explícito.
 *
 * Retorna `null` quando o petshop não existir / service role indisponível.
 */
export async function getPlanLimits(
  petshopId: string,
): Promise<PlanLimits | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: petshop } = await admin
    .from("petshops")
    .select("id, plan_id, plan_name")
    .eq("id", petshopId)
    .maybeSingle();
  if (!petshop) return null;

  let maxUsers = 5;
  let allowsVeterinarian = true;
  let planName = petshop.plan_name ?? "Profissional";

  if (petshop.plan_id) {
    const { data: plan } = await admin
      .from("plans")
      .select("name, max_users, allows_veterinarian")
      .eq("id", petshop.plan_id)
      .maybeSingle();
    if (plan) {
      maxUsers = plan.max_users;
      allowsVeterinarian = plan.allows_veterinarian;
      planName = plan.name;
    }
  }

  const { count } = await admin
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("petshop_id", petshopId)
    .eq("status", "active")
    .is("deleted_at", null);

  return {
    planName,
    maxUsers,
    allowsVeterinarian,
    currentUsers: count ?? 0,
  };
}

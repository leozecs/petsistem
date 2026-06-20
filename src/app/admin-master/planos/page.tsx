import { redirect } from "next/navigation";
import { PlanosManager } from "@/components/admin-planos/planos-manager";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPlanosPage() {
  const session = await getSession();
  if (!session || session.user.globalRole !== "admin_master") {
    redirect("/login?error=not-authorized");
  }
  const admin = createAdminClient();
  const { data } = admin
    ? await admin.from("plans").select("*").order("price_cents")
    : { data: [] };

  return <PlanosManager initialPlans={data ?? []} />;
}

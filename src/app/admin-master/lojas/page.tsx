import { redirect } from "next/navigation";
import { LojasManager } from "@/components/admin-lojas/lojas-manager";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminLojasPage() {
  const session = await getSession();
  if (!session || session.user.globalRole !== "admin_master") {
    redirect("/login?error=not-authorized");
  }
  const admin = createAdminClient();
  const { data } = admin
    ? await admin
        .from("petshops")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
    : { data: [] };

  return <LojasManager initialPetshops={data ?? []} />;
}

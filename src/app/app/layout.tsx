import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getSession } from "@/lib/auth/session";

export default async function TenantAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/login?error=session-required");
  }

  if (!session.activeMembership) {
    if (session.user.globalRole === "admin_master") {
      redirect("/admin-master?error=no-tenant-selected");
    }
    redirect("/login?error=no-tenant");
  }

  if (session.activeMembership.petshop.status === "blocked") {
    redirect("/login?error=tenant-blocked");
  }

  return <AppShell session={session}>{children}</AppShell>;
}

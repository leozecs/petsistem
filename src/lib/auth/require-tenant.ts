import { redirect } from "next/navigation";
import { getSession, type Membership, type SessionContext, type MemberRole } from "@/lib/auth/session";
import { isPetshopOperational } from "@/lib/petshop-status";

export type TenantContext = {
  session: SessionContext;
  membership: Membership;
};

export async function requireTenant(): Promise<TenantContext> {
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
  if (!isPetshopOperational(session.activeMembership.petshop.status)) {
    redirect("/login?error=tenant-blocked");
  }
  return { session, membership: session.activeMembership };
}

export function hasRole(membership: Membership, allowed: MemberRole[]): boolean {
  return allowed.includes(membership.role);
}

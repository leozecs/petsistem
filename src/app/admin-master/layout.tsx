import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getSession, isAdminMaster } from "@/lib/auth/session";

export default async function AdminMasterLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/login?error=session-required");
  }

  if (!isAdminMaster(session)) {
    redirect("/login?error=not-authorized");
  }

  return (
    <AppShell session={session} variant="admin">
      {children}
    </AppShell>
  );
}

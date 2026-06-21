import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/login-screen";
import { getSession } from "@/lib/auth/session";

// The root `/` only handles the marketing/admin domain (petsistem.com.br).
// Tenant subdomains (<slug>.petsistem.com.br) are rewritten by the middleware
// to `/loja/<slug>`, so they never hit this page.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; until?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (session) {
    if (session.user.globalRole === "admin_master") {
      redirect("/admin-master");
    }
    if (session.activeMembership) {
      redirect("/app");
    }
  }
  return <LoginScreen error={params.error} until={params.until} />;
}

import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/login-screen";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
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

  return <LoginScreen error={params.error} />;
}

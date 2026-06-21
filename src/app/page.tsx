import { redirect } from "next/navigation";
import MarketingPage from "./marketing/page";
import { getSession } from "@/lib/auth/session";

// Apex / (e www.) renderiza a landing pública. Sessão ativa cai direto no
// painel correto. Quem quer logar acessa /login.
export default async function Home() {
  const session = await getSession();
  if (session) {
    if (session.user.globalRole === "admin_master") {
      redirect("/admin-master");
    }
    if (session.activeMembership) {
      redirect("/app");
    }
  }
  return <MarketingPage />;
}

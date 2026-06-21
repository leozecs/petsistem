import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/signup/signup-form";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Criar minha loja · PETSISTEM",
};

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    if (session.user.globalRole === "admin_master") redirect("/admin-master");
    if (session.activeMembership) redirect("/app");
  }
  return <SignupForm />;
}

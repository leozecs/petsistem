import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/signup/signup-form";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Criar minha loja · PETSISTEM",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; plan?: string; billing?: string }>;
}) {
  const session = await getSession();
  if (session) {
    if (session.user.globalRole === "admin_master") redirect("/admin-master");
    if (session.activeMembership) redirect("/app");
  }
  const params = await searchParams;
  return (
    <SignupForm
      mode={params.mode === "paid" ? "paid" : "trial"}
      plan={params.plan}
      billing={params.billing === "annual" ? "annual" : "monthly"}
    />
  );
}

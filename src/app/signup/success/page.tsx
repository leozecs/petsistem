import type { Metadata } from "next";
import { SignupSuccess } from "@/components/signup/signup-success";

export const metadata: Metadata = {
  title: "Confira seu email · PETSISTEM",
};

export default async function SignupSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    mode?: string;
    shop?: string;
    plan?: string;
    amount?: string;
    billing?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <SignupSuccess
      email={params.email ?? ""}
      mode={params.mode === "paid" ? "paid" : "trial"}
      shopName={params.shop ?? ""}
      planName={params.plan ?? ""}
      amountCents={Number(params.amount ?? 0)}
      billing={params.billing === "annual" ? "annual" : "monthly"}
    />
  );
}

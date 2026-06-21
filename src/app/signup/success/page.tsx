import type { Metadata } from "next";
import { SignupSuccess } from "@/components/signup/signup-success";

export const metadata: Metadata = {
  title: "Confira seu email · PETSISTEM",
};

export default async function SignupSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <SignupSuccess email={email ?? ""} />;
}

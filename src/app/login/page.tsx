import { LoginScreen } from "@/components/auth/login-screen";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <LoginScreen error={params.error} />;
}

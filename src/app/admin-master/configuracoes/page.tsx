import { redirect } from "next/navigation";
import { ConfigForm } from "@/components/admin-config/config-form";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminConfigPage() {
  const session = await getSession();
  if (!session || session.user.globalRole !== "admin_master") {
    redirect("/login?error=not-authorized");
  }
  const admin = createAdminClient();
  if (!admin) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Service role do Supabase não configurado.
      </div>
    );
  }

  // Pode falhar se a migration 20260620200000 ainda não foi aplicada — o form
  // mostra valores em branco e a action retorna erro descritivo no submit.
  const [profileRes, pixRes] = await Promise.all([
    admin
      .from("users")
      .select("full_name, email")
      .eq("id", session.user.id)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from("platform_settings")
      .select("pix_key, pix_holder_name")
      .eq("id", 1)
      .maybeSingle() as Promise<{
        data: { pix_key: string | null; pix_holder_name: string | null } | null;
      }>,
  ]);

  return (
    <ConfigForm
      fullName={profileRes.data?.full_name ?? session.user.fullName}
      email={profileRes.data?.email ?? session.user.email}
      pixKey={pixRes.data?.pix_key ?? ""}
      pixHolderName={pixRes.data?.pix_holder_name ?? ""}
    />
  );
}

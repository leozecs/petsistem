import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BookingPage } from "@/components/booking/booking-page";
import { LoginScreen } from "@/components/auth/login-screen";
import { resolveTenantFromHost } from "@/lib/tenant";
import { getSession } from "@/lib/auth/session";

function storeNameFromSubdomain(subdomain: string) {
  return subdomain
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [headerList, params] = await Promise.all([headers(), searchParams]);
  const tenant = resolveTenantFromHost(headerList.get("host"));

  if (tenant.zone === "tenant" && tenant.subdomain) {
    return <BookingPage storeName={storeNameFromSubdomain(tenant.subdomain)} />;
  }

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

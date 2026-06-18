import type { Metadata } from "next";
import { TenantStorefront } from "@/components/marketing/tenant-storefront";

export const metadata: Metadata = {
  title: "Loja demo",
};

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TenantStorefront slug={slug} />;
}

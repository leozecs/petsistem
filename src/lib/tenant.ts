import { siteConfig } from "@/lib/env";

const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export type TenantContext = {
  host: string;
  zone: "master" | "tenant" | "local";
  subdomain: string | null;
};

export function resolveTenantFromHost(hostHeader: string | null): TenantContext {
  const host = (hostHeader ?? "").split(":")[0].toLowerCase();

  if (!host || localHosts.has(host)) {
    return { host: host || "localhost", zone: "local", subdomain: null };
  }

  if (host === siteConfig.rootDomain || host === `www.${siteConfig.rootDomain}`) {
    return { host, zone: "master", subdomain: null };
  }

  if (host.endsWith(`.${siteConfig.rootDomain}`)) {
    const subdomain = host.replace(`.${siteConfig.rootDomain}`, "");
    return { host, zone: "tenant", subdomain };
  }

  return { host, zone: "master", subdomain: null };
}

export function currencyBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function shortDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
}

export function shortTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

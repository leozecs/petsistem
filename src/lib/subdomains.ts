export const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "admin", "admin-master", "api", "auth", "static", "assets",
  "cdn", "mail", "blog", "login", "signup", "marketing", "suporte", "support",
  "status", "docs", "dashboard", "painel", "billing", "checkout", "ftp", "smtp",
  "imap", "pop", "mx", "ns1", "ns2",
]);

export function isReservedSubdomain(value: string): boolean {
  return RESERVED_SUBDOMAINS.has(value.trim().toLowerCase());
}

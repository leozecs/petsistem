import { NextResponse, type NextRequest } from "next/server";

/**
 * Tenant subdomain router.
 *
 * Maps `<slug>.petsistem.com.br/<path>` → `/loja/<slug>/<path>` so the existing
 * tenant-public app under `app/loja/[slug]/...` serves the slug without needing
 * a separate URL surface. Path-based access (`petsistem.com.br/loja/<slug>`)
 * continues to work for backward compatibility.
 *
 * Subdomains that are PART OF THE APP itself (`app`, `admin`, `www`, etc.) are
 * NOT rewritten — they pass through so /login, /app, /admin-master remain.
 *
 * Dev mode: `<slug>.localhost:3000` works the same way because Next strips the
 * port when reading host.
 */

const ROOT_DOMAINS = (
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "petsistem.com.br"
)
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .concat(["petsistem.vercel.app", "localhost"]);

const RESERVED = new Set([
  "www",
  "app",
  "admin",
  "api",
  "auth",
  "static",
  "assets",
  "cdn",
  "mail",
  "blog",
]);

function extractSubdomain(host: string): string | null {
  // Strip port (localhost:3000 → localhost)
  const bare = host.toLowerCase().split(":")[0]!;
  for (const root of ROOT_DOMAINS) {
    if (bare === root) return null;
    if (bare.endsWith("." + root)) {
      const sub = bare.slice(0, -1 - root.length);
      // Vercel preview deployments produce hashes like `branch-app-...vercel.app`;
      // we don't want to treat those as tenant slugs. Skip when only one dot-less
      // label remains, but the label looks like a hash.
      if (RESERVED.has(sub)) return null;
      // No multi-level subdomains.
      if (sub.includes(".")) return null;
      return sub;
    }
  }
  return null;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  // Static assets and Next internals are matched out by `config.matcher` below,
  // so we only ever process page requests here.
  const host = req.headers.get("host") ?? "";
  const sub = extractSubdomain(host);
  if (!sub) return NextResponse.next();

  // Already on a `/loja/...` URL means a direct path-based access; don't double
  // rewrite. Same for the marketing surface (`/login` etc) — we only rewrite
  // when the path is at the tenant root or an unknown path.
  if (url.pathname.startsWith("/loja/")) return NextResponse.next();

  const rewritten = url.clone();
  rewritten.pathname = `/loja/${sub}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(rewritten);
}

export const config = {
  // Skip static assets, the favicon, image optimisation, and API routes.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};

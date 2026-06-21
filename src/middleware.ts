import { NextResponse, type NextRequest } from "next/server";

/**
 * Host-based router for the multi-surface deployment:
 *
 *   <slug>.petsistem.com.br/<path>     → /loja/<slug>/<path>   (tenant booking)
 *   app.petsistem.com.br/<path>        → /<path>                (signed-in app)
 *   petsistem.com.br/                  → /marketing              (public landing)
 *   petsistem.com.br/<known path>      → /<path>                 (e.g. /signup, /login)
 *
 * `app`, `admin`, `www` etc are reserved subdomains — they pass through the
 * tenant detection so /login, /app, /admin-master stay untouched.
 *
 * In dev (localhost:3000) the apex behaves like the marketing surface so you
 * can iterate on the landing without faking DNS.
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

// Paths that should always render at the apex even when the user types them
// directly — never get rewritten to /marketing.
const APEX_APP_PATHS = new Set([
  "/login",
  "/signup",
  "/marketing",
]);

type HostKind =
  | { kind: "tenant"; slug: string }
  | { kind: "app" } // app.petsistem.com.br
  | { kind: "apex" } // petsistem.com.br (or localhost)
  | { kind: "unknown" }; // unrecognized host — pass through

function classifyHost(host: string): HostKind {
  const bare = host.toLowerCase().split(":")[0]!;
  for (const root of ROOT_DOMAINS) {
    if (bare === root) return { kind: "apex" };
    if (bare.endsWith("." + root)) {
      const sub = bare.slice(0, -1 - root.length);
      if (sub.includes(".")) return { kind: "unknown" };
      if (sub === "app") return { kind: "app" };
      if (RESERVED.has(sub)) return { kind: "unknown" };
      return { kind: "tenant", slug: sub };
    }
  }
  return { kind: "unknown" };
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get("host") ?? "";
  const cls = classifyHost(host);

  if (cls.kind === "tenant") {
    if (url.pathname.startsWith("/loja/")) return NextResponse.next();
    const rewritten = url.clone();
    rewritten.pathname = `/loja/${cls.slug}${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(rewritten);
  }

  if (cls.kind === "apex") {
    // Apex root → marketing landing. Other apex paths (e.g. /login, /signup,
    // /api/...) still render normally.
    if (url.pathname === "/") {
      const rewritten = url.clone();
      rewritten.pathname = "/marketing";
      return NextResponse.rewrite(rewritten);
    }
    if (APEX_APP_PATHS.has(url.pathname)) return NextResponse.next();
    return NextResponse.next();
  }

  // app subdomain or anything else — pass through unchanged.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};

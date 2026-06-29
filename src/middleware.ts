import { NextResponse, type NextRequest } from "next/server";
import { isReservedSubdomain } from "@/lib/subdomains";

/**
 * Host-based router:
 *
 *   <slug>.petsistem.com.br/<path>   → /loja/<slug>/<path>   (tenant booking)
 *   petsistem.com.br/                 → /marketing            (public landing)
 *   petsistem.com.br/login            → /login                (sign in)
 *   petsistem.com.br/signup           → /signup               (cadastro)
 *   petsistem.com.br/app              → /app                  (painel autenticado)
 *   petsistem.com.br/admin-master     → /admin-master         (admin)
 *
 * Toda a interface autenticada mora no apex (petsistem.com.br). Subdomínios
 * reservados (app, admin, www, etc) continuam passando direto pra preservar
 * URLs históricas, mas não são o caminho preferido — basta acessar o apex.
 */

const ROOT_DOMAINS = (
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "petsistem.com.br"
)
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .concat(["petsistem.vercel.app", "localhost"]);

type HostKind =
  | { kind: "tenant"; slug: string }
  | { kind: "app" } // app.petsistem.com.br
  | { kind: "apex" } // petsistem.com.br (or localhost)
  | { kind: "unknown" }; // unrecognized host — pass through

export function classifyHost(host: string): HostKind {
  const bare = host.toLowerCase().split(":")[0]!;
  for (const root of ROOT_DOMAINS) {
    if (bare === root) return { kind: "apex" };
    if (bare.endsWith("." + root)) {
      const sub = bare.slice(0, -1 - root.length);
      if (sub.includes(".")) return { kind: "unknown" };
      if (sub === "app") return { kind: "app" };
      if (isReservedSubdomain(sub)) return { kind: "unknown" };
      return { kind: "tenant", slug: sub };
    }
  }
  return { kind: "unknown" };
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get("host") ?? "";
  const cls = classifyHost(host);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-petsistem-pathname", url.pathname);

  if (cls.kind === "tenant") {
    if (url.pathname.startsWith("/loja/")) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    const rewritten = url.clone();
    rewritten.pathname = `/loja/${cls.slug}${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(rewritten, { request: { headers: requestHeaders } });
  }

  if (cls.kind === "apex") {
    // Apex root → marketing landing. Other apex paths (e.g. /login, /signup,
    // /api/...) still render normally.
    if (url.pathname === "/") {
      const rewritten = url.clone();
      rewritten.pathname = "/marketing";
      return NextResponse.rewrite(rewritten, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // app subdomain or anything else — pass through unchanged.
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};

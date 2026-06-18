import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type TenantContext = {
  host: string;
  zone: "master" | "tenant" | "local";
  subdomain: string | null;
};

const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function resolveTenantFromHost(hostHeader: string | null): TenantContext {
  const host = (hostHeader ?? "").split(":")[0].toLowerCase();
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "petsistem.com.br";

  if (!host || localHosts.has(host)) {
    return { host: host || "localhost", zone: "local", subdomain: null };
  }

  if (host === rootDomain || host === `www.${rootDomain}`) {
    return { host, zone: "master", subdomain: null };
  }

  if (host.endsWith(`.${rootDomain}`)) {
    return {
      host,
      zone: "tenant",
      subdomain: host.replace(`.${rootDomain}`, ""),
    };
  }

  return { host, zone: "master", subdomain: null };
}

async function updateSession(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export async function middleware(request: NextRequest) {
  const tenant = resolveTenantFromHost(request.headers.get("host"));
  const requestHeaders = new Headers(request.headers);
  const { pathname } = request.nextUrl;

  requestHeaders.set("x-petsistem-host", tenant.host);
  requestHeaders.set("x-petsistem-zone", tenant.zone);
  if (tenant.subdomain) {
    requestHeaders.set("x-petsistem-subdomain", tenant.subdomain);
  }

  if (tenant.zone === "tenant" && tenant.subdomain && pathname === "/") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/loja/${tenant.subdomain}`;
    return updateSession(
      request,
      NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: requestHeaders,
        },
      }),
    );
  }

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response = await updateSession(request, response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

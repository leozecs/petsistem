import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantFromHost } from "@/lib/tenant";
import { updateSession } from "@/lib/supabase/middleware";

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

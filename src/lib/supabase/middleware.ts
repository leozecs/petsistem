import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { siteConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey, {
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

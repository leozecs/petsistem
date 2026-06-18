import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { siteConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  if (!siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) {
    return null;
  }

  return createServerClient<Database>(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies. Middleware refresh handles it.
        }
      },
    },
  });
}

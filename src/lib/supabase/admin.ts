import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!siteConfig.supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(siteConfig.supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

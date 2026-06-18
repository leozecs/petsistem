import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/env";

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!siteConfig.supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(siteConfig.supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

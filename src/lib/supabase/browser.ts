"use client";

import { createBrowserClient } from "@supabase/ssr";
import { siteConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) {
    throw new Error("Supabase env vars are missing.");
  }

  return createBrowserClient<Database>(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey);
}

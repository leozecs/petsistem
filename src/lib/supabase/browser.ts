"use client";

import { createBrowserClient } from "@supabase/ssr";
import { siteConfig } from "@/lib/env";

export function createClient() {
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseAnonKey) {
    throw new Error("Supabase env vars are missing.");
  }

  return createBrowserClient(siteConfig.supabaseUrl, siteConfig.supabaseAnonKey);
}

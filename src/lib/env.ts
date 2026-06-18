export const siteConfig = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  rootDomain: process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "petsistem.com.br",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function hasSupabaseEnv() {
  return Boolean(siteConfig.supabaseUrl && siteConfig.supabaseAnonKey);
}

"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

// Janela e teto do rate limit: 3 falhas em 15 min por email OU IP travam o
// login até a janela passar. Quem acertou a senha nesse intervalo zera o
// contador da própria combinação.
const RATE_LIMIT_WINDOW_MIN = 15;
const RATE_LIMIT_MAX_FAILURES = 3;

async function getClientIp(): Promise<string | null> {
  const h = await headers();
  // Vercel proxy headers — usa o primeiro IP, que é o real do cliente.
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

// Whitelists pra interpolação no filter DSL do PostgREST. Email deve ser um
// endereço real (zod email já garante formato), IP deve casar IPv4/IPv6 básico.
// Sem essa validação, vírgulas/operators no input transformam o or() em outro
// query (ex: "email=victim,succeeded.is.true" bypassa o lockout).
const EMAIL_RE = /^[^\s,()@]+@[^\s,()@]+\.[^\s,()@]+$/;
const IP_RE = /^[a-fA-F0-9:.]{3,45}$/;

async function isRateLimited(email: string, ip: string | null): Promise<{
  blocked: boolean;
  unlockAt: Date | null;
}> {
  // Defense-in-depth: se input não casa com o formato esperado, não conta como
  // limite (e o tentar logar também vai falhar antes por dados inválidos).
  if (!EMAIL_RE.test(email)) return { blocked: false, unlockAt: null };
  const safeIp = ip && IP_RE.test(ip) ? ip : null;

  const admin = createAdminClient();
  if (!admin) return { blocked: false, unlockAt: null };

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000);

  // Conta falhas no email OU no IP na janela.
  const filter = safeIp
    ? `email.eq.${email},ip.eq.${safeIp}`
    : `email.eq.${email}`;
  const { data, error } = await admin
    .from("login_attempts")
    .select("attempted_at")
    .or(filter)
    .eq("succeeded", false)
    .gte("attempted_at", windowStart.toISOString())
    .order("attempted_at", { ascending: true });
  if (error) return { blocked: false, unlockAt: null };

  const failures = data ?? [];
  if (failures.length < RATE_LIMIT_MAX_FAILURES) {
    return { blocked: false, unlockAt: null };
  }
  // Bloqueio expira `WINDOW` minutos depois da PRIMEIRA falha que ainda está
  // na janela — assim a janela rola de verdade em vez de eternizar.
  const oldest = new Date(failures[0]!.attempted_at);
  const unlockAt = new Date(oldest.getTime() + RATE_LIMIT_WINDOW_MIN * 60_000);
  return { blocked: true, unlockAt };
}

async function logAttempt(email: string, ip: string | null, succeeded: boolean) {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("login_attempts").insert({
    email,
    ip,
    succeeded,
  });
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing-fields");
  }

  const ip = await getClientIp();

  // Rate-limit ANTES de bater no Supabase Auth pra evitar carga inútil e
  // pra que o ataque de força bruta seja barato de bloquear.
  const { blocked, unlockAt } = await isRateLimited(email, ip);
  if (blocked && unlockAt) {
    const until = encodeURIComponent(unlockAt.toISOString());
    redirect(`/login?error=rate-limited&until=${until}`);
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/login?error=supabase-not-configured");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await logAttempt(email, ip, false);
    if (error.message?.toLowerCase().includes("not confirmed")) {
      redirect(
        `/login?error=email-not-confirmed&email=${encodeURIComponent(email)}`,
      );
    }
    redirect("/login?error=invalid-credentials");
  }

  // Sucesso — registra com succeeded=true. Esse registro NÃO conta no rate
  // limit (a query filtra por succeeded=false), então o contador zera naturalmente.
  await logAttempt(email, ip, true);

  const session = await getSession();
  if (!session) {
    redirect("/login?error=profile-missing");
  }

  if (session.user.globalRole === "admin_master") {
    redirect("/admin-master");
  }

  if (!session.activeMembership) {
    redirect("/login?error=no-tenant");
  }

  if (session.activeMembership.petshop.status === "blocked") {
    redirect("/login?error=tenant-blocked");
  }

  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  // Limpa cookie de loja ativa pra próxima sessão escolher a default determinística.
  const jar = await cookies();
  jar.delete("active_petshop_id");
  redirect("/login");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Seta o cookie `active_petshop_id`, só se o usuário tem membership ativa
 * naquela loja. Cookie é HttpOnly + SameSite=Lax + Path=/. Sem expiry —
 * persiste por sessão do browser.
 */
export async function setActivePetshop(petshopId: string): Promise<{ ok: boolean; error?: string }> {
  if (!UUID_RE.test(petshopId)) return { ok: false, error: "ID inválido." };

  const session = await getSession();
  if (!session) return { ok: false, error: "Sem sessão." };

  const isMember = session.memberships.some((m) => m.petshopId === petshopId);
  if (!isMember) return { ok: false, error: "Você não pertence a essa loja." };

  const jar = await cookies();
  jar.set("active_petshop_id", petshopId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  // Forca re-render do painel pra refletir a loja ativa nova em todas as
  // pages cacheadas (dashboard, sidebar, etc).
  revalidatePath("/app", "layout");
  return { ok: true };
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing-fields");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/login?error=supabase-not-configured");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Supabase distingue email não confirmado por código 400 + mensagem específica.
    if (error.message?.toLowerCase().includes("not confirmed")) {
      redirect(`/login?error=email-not-confirmed&email=${encodeURIComponent(email)}`);
    }
    redirect("/login?error=invalid-credentials");
  }

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
  redirect("/login");
}

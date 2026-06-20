"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import type { Database } from "@/lib/supabase/database.types";

type PetshopStatus = Database["public"]["Enums"]["petshop_status"];

export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

async function requireAdminMaster(): Promise<{ ok: true; userId: string } | { ok: false }> {
  const session = await getSession();
  if (!session || session.user.globalRole !== "admin_master") return { ok: false };
  return { ok: true, userId: session.user.id };
}

// ---------------------------------------------------------------------------
// CREATE LOJA + DONO
// ---------------------------------------------------------------------------

const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

const createSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório").max(120),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Subdomínio muito curto")
    .max(32)
    .regex(subdomainRegex, "Use apenas letras minúsculas, números e hífen"),
  address: z.string().trim().max(2000).optional(),
  ownerName: z.string().trim().min(2, "Nome do dono obrigatório").max(120),
  ownerEmail: z.string().trim().toLowerCase().email("Email inválido"),
  ownerPassword: z.string().min(8, "Senha precisa de pelo menos 8 caracteres").max(72),
});

// Subdomains reservados pra evitar colisão com app/admin/marketing.
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "admin",
  "api",
  "auth",
  "static",
  "assets",
  "cdn",
  "mail",
  "blog",
]);

/**
 * Provisiona loja completa: petshops row + Supabase Auth user (dono) + users
 * profile + membership(role='owner'). Best-effort rollback se algum passo
 * falhar — a auth user é deletado pra liberar o email pra retry.
 */
export async function createPetshopWithOwner(
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdminMaster();
  if (!guard.ok) return { ok: false, error: "Apenas Admin Master." };
  const adminUserId = guard.userId;

  const raw = {
    name: String(formData.get("name") ?? ""),
    subdomain: String(formData.get("subdomain") ?? ""),
    address: String(formData.get("address") ?? "") || undefined,
    ownerName: String(formData.get("ownerName") ?? ""),
    ownerEmail: String(formData.get("ownerEmail") ?? ""),
    ownerPassword: String(formData.get("ownerPassword") ?? ""),
  };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  if (RESERVED_SUBDOMAINS.has(parsed.data.subdomain)) {
    return {
      ok: false,
      fieldErrors: { subdomain: "Esse subdomínio é reservado pelo sistema." },
    };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role do Supabase não configurado." };

  // Uniqueness check on subdomain across active tenants
  const { data: existing } = await admin
    .from("petshops")
    .select("id")
    .or(`subdomain.eq.${parsed.data.subdomain},slug.eq.${parsed.data.subdomain}`)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      fieldErrors: { subdomain: "Esse subdomínio já está em uso." },
    };
  }

  // 1) Auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.ownerEmail,
    password: parsed.data.ownerPassword,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.ownerName },
  });
  if (authErr || !authData.user) {
    if (authErr?.message?.toLowerCase().includes("already")) {
      return {
        ok: false,
        fieldErrors: {
          ownerEmail: "Já existe um login com esse email. Use outro.",
        },
      };
    }
    return { ok: false, error: authErr?.message ?? "Falha ao criar login do dono." };
  }
  const ownerId = authData.user.id;
  const rollbackAuth = async () => {
    try {
      await admin.auth.admin.deleteUser(ownerId);
    } catch {
      /* best-effort */
    }
  };

  // 2) users profile
  const { error: profErr } = await admin.from("users").insert({
    id: ownerId,
    email: parsed.data.ownerEmail,
    full_name: parsed.data.ownerName,
    global_role: "user",
  });
  if (profErr && !profErr.message.includes("duplicate")) {
    await rollbackAuth();
    return { ok: false, error: profErr.message };
  }

  // 3) petshops row (slug + subdomain iguais por default)
  const { data: petshop, error: shopErr } = await admin
    .from("petshops")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.subdomain,
      subdomain: parsed.data.subdomain,
      address: parsed.data.address ?? null,
      status: "active",
      plan_name: "Essencial",
      primary_color: "#0b0b0c",
      settings: {},
      created_by: adminUserId,
    })
    .select("id")
    .single();
  if (shopErr || !petshop) {
    await rollbackAuth();
    return { ok: false, error: shopErr?.message ?? "Falha ao criar loja." };
  }

  // 4) membership como owner
  const { error: memErr } = await admin.from("memberships").insert({
    petshop_id: petshop.id,
    user_id: ownerId,
    role: "owner",
    status: "active",
    created_by: adminUserId,
  });
  if (memErr) {
    // Limpa petshop + auth user pra deixar consistente.
    await admin.from("petshops").delete().eq("id", petshop.id);
    await rollbackAuth();
    return { ok: false, error: memErr.message };
  }

  // 5) calendários default (Banho e Tosa + Veterinária)
  await admin.from("calendars").insert([
    {
      petshop_id: petshop.id,
      area: "grooming",
      name: "Banho e Tosa",
      active: true,
      created_by: adminUserId,
    },
    {
      petshop_id: petshop.id,
      area: "veterinary",
      name: "Veterinária",
      active: true,
      created_by: adminUserId,
    },
  ]);

  revalidatePath("/admin-master/lojas");
  revalidatePath("/admin-master");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// EDITAR LOJA
// ---------------------------------------------------------------------------

const editSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(32)
    .regex(subdomainRegex, "Use apenas letras minúsculas, números e hífen"),
  address: z.string().trim().max(2000).optional(),
});

export async function savePetshop(formData: FormData): Promise<ActionState> {
  const guard = await requireAdminMaster();
  if (!guard.ok) return { ok: false, error: "Apenas Admin Master." };

  const parsed = editSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    subdomain: String(formData.get("subdomain") ?? ""),
    address: String(formData.get("address") ?? "") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  if (RESERVED_SUBDOMAINS.has(parsed.data.subdomain)) {
    return {
      ok: false,
      fieldErrors: { subdomain: "Esse subdomínio é reservado pelo sistema." },
    };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  // Conflict check (excluir o próprio id)
  const { data: existing } = await admin
    .from("petshops")
    .select("id")
    .or(`subdomain.eq.${parsed.data.subdomain},slug.eq.${parsed.data.subdomain}`)
    .neq("id", parsed.data.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      fieldErrors: { subdomain: "Esse subdomínio já está em uso." },
    };
  }

  const { error } = await admin
    .from("petshops")
    .update({
      name: parsed.data.name,
      slug: parsed.data.subdomain,
      subdomain: parsed.data.subdomain,
      address: parsed.data.address ?? null,
      updated_by: guard.userId,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin-master/lojas");
  revalidatePath("/admin-master");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// STATUS (active / blocked / trial / cancelled)
// ---------------------------------------------------------------------------

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "blocked", "trial", "cancelled"] as const),
});

export async function setPetshopStatus(
  id: string,
  status: PetshopStatus,
): Promise<ActionState> {
  const guard = await requireAdminMaster();
  if (!guard.ok) return { ok: false, error: "Apenas Admin Master." };

  const parsed = statusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { error } = await admin
    .from("petshops")
    .update({ status: parsed.data.status, updated_by: guard.userId })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin-master/lojas");
  revalidatePath("/admin-master");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// MÉTRICAS DA LOJA (drawer)
// ---------------------------------------------------------------------------

export type PetshopMetrics = {
  usersCount: number;
  monthAppointments: number;
  monthRevenueCents: number;
  ownerName: string | null;
  ownerEmail: string | null;
};

export async function getPetshopMetrics(
  petshopId: string,
): Promise<{ ok: true; data: PetshopMetrics } | { ok: false; error: string }> {
  const guard = await requireAdminMaster();
  if (!guard.ok) return { ok: false, error: "Apenas Admin Master." };
  if (!z.string().uuid().safeParse(petshopId).success) {
    return { ok: false, error: "ID inválido." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [usersRes, apptRes, chargeRes, ownerRes] = await Promise.all([
    admin
      .from("memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("petshop_id", petshopId)
      .is("deleted_at", null),
    admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("petshop_id", petshopId)
      .gte("starts_at", monthStart.toISOString())
      .lt("starts_at", monthEnd.toISOString())
      .is("deleted_at", null),
    admin
      .from("appointment_charges")
      .select("price_cents, paid_at")
      .eq("petshop_id", petshopId)
      .not("paid_at", "is", null)
      .gte("paid_at", monthStart.toISOString())
      .lt("paid_at", monthEnd.toISOString()),
    admin
      .from("memberships")
      .select("user:users(full_name, email)")
      .eq("petshop_id", petshopId)
      .eq("role", "owner")
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle(),
  ]);

  const monthRevenueCents = (chargeRes.data ?? []).reduce(
    (s, c) => s + (c.price_cents ?? 0),
    0,
  );

  const owner = (ownerRes.data?.user ?? null) as
    | { full_name: string; email: string }
    | null;

  return {
    ok: true,
    data: {
      usersCount: usersRes.count ?? 0,
      monthAppointments: apptRes.count ?? 0,
      monthRevenueCents,
      ownerName: owner?.full_name ?? null,
      ownerEmail: owner?.email ?? null,
    },
  };
}

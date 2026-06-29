"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import type { Database } from "@/lib/supabase/database.types";
import { isReservedSubdomain } from "@/lib/subdomains";

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

  if (isReservedSubdomain(parsed.data.subdomain)) {
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

  // 1a) Preflight: bloqueia se o email já existe em public.users.
  // Sem essa checagem, o auth.createUser pode retornar um id novo cujo email
  // colide com a UNIQUE de public.users.email — o insert do profile falha com
  // "duplicate", o catch atual swallowa o erro, e o membership insere com um
  // user_id que NÃO existe em public.users → FK violation
  // `memberships_user_id_fkey`. Mais seguro impedir a colisão antes.
  const { data: existingProfile } = await admin
    .from("users")
    .select("id")
    .eq("email", parsed.data.ownerEmail)
    .maybeSingle();
  if (existingProfile) {
    return {
      ok: false,
      fieldErrors: {
        ownerEmail:
          "Já existe um usuário com esse email. Use outro pro dono da loja.",
      },
    };
  }

  // 1b) Auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.ownerEmail,
    password: parsed.data.ownerPassword,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.ownerName },
  });
  if (authErr || !authData.user) {
    const msg = authErr?.message?.toLowerCase() ?? "";
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists") ||
      msg.includes("duplicate")
    ) {
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

  // 2) users profile — agora qualquer erro força rollback do auth user.
  // O preflight acima já cobriu o caso de duplicate por email; se ainda assim
  // duplicar (race condition), tratar como falha real em vez de swallow.
  const { error: profErr } = await admin.from("users").insert({
    id: ownerId,
    email: parsed.data.ownerEmail,
    full_name: parsed.data.ownerName,
    global_role: "user",
  });
  if (profErr) {
    await rollbackAuth();
    if (profErr.message.toLowerCase().includes("duplicate")) {
      return {
        ok: false,
        fieldErrors: {
          ownerEmail: "Email já cadastrado em outro usuário. Tente outro.",
        },
      };
    }
    return { ok: false, error: profErr.message };
  }

  const { data: starterPlan, error: planError } = await admin
    .from("plans")
    .select("id, name, price_cents")
    .eq("code", "starter")
    .eq("active", true)
    .single();
  if (planError || !starterPlan) {
    await rollbackAuth();
    return { ok: false, error: "Plano inicial não está configurado." };
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
      plan_id: starterPlan.id,
      plan_name: starterPlan.name,
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
  const { error: calendarError } = await admin.from("calendars").insert([
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
  if (calendarError) {
    await admin.from("petshops").delete().eq("id", petshop.id);
    await rollbackAuth();
    return { ok: false, error: calendarError.message };
  }

  // 6) A loja já nasce com cobrança vinculada ao plano inicial.
  const dueDate = new Date();
  dueDate.setUTCDate(dueDate.getUTCDate() + 30);
  const { error: subscriptionError } = await admin.from("subscriptions").insert({
    petshop_id: petshop.id,
    plan_name: starterPlan.name,
    amount_cents: starterPlan.price_cents,
    due_date: dueDate.toISOString().slice(0, 10),
    status: "pending",
    created_by: adminUserId,
  });
  if (subscriptionError) {
    await admin.from("petshops").delete().eq("id", petshop.id);
    await rollbackAuth();
    return { ok: false, error: subscriptionError.message };
  }

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

  if (isReservedSubdomain(parsed.data.subdomain)) {
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
    .update({
      status: parsed.data.status,
      billing_blocked_at: null,
      updated_by: guard.userId,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin-master/lojas");
  revalidatePath("/admin-master");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// EXCLUSÃO PERMANENTE — IRREVERSÍVEL
// ---------------------------------------------------------------------------

const deleteSchema = z.object({
  id: z.string().uuid(),
  confirm_slug: z.string().trim().min(1),
});

/**
 * HARD DELETE da loja inteira. Apaga petshops row (cascade leva calendars,
 * services, appointments, clients, pets, employees, veterinarians, charges,
 * expenses, revenue_items, categories, checklists, memberships,
 * subscriptions, payments, login_attempts via tabelas vinculadas).
 *
 * Também varre os buckets `appointment-photos/<id>/...` e
 * `petshop-logos/<id>/...` removendo todos os arquivos.
 *
 * NÃO deleta auth users dos donos — eles podem pertencer a outras lojas. Se
 * o owner ficar sem memberships, mantém a conta auth (sem acesso a nada).
 *
 * Confirmação dupla: caller precisa enviar o slug atual da loja no parâmetro
 * `confirm_slug`. Bate exatamente ou nega — evita clique acidental.
 */
export async function permanentlyDeletePetshop(input: {
  id: string;
  confirm_slug: string;
}): Promise<ActionState> {
  const guard = await requireAdminMaster();
  if (!guard.ok) return { ok: false, error: "Apenas Admin Master." };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  // Confere que a loja existe e que o slug bate (dupla verificação).
  const { data: shop } = await admin
    .from("petshops")
    .select("id, slug, name")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!shop) return { ok: false, error: "Loja não encontrada." };
  if (shop.slug !== parsed.data.confirm_slug.trim().toLowerCase()) {
    return {
      ok: false,
      error: `Confirmação não bate. Digite exatamente "${shop.slug}" pra confirmar.`,
    };
  }

  // 1) Limpa storage: appointment-photos/<id>/...
  // List + remove recursivo. supabase storage `list` retorna 100 por página.
  async function purgeBucketPrefix(bucket: string, prefix: string) {
    const queue: string[] = [prefix];
    while (queue.length > 0) {
      const dir = queue.shift()!;
      const { data: items } = await admin!.storage.from(bucket).list(dir, {
        limit: 1000,
      });
      if (!items || items.length === 0) continue;
      const files = items.filter((i) => i.id !== null).map((i) => `${dir}/${i.name}`);
      const folders = items.filter((i) => i.id === null);
      if (files.length > 0) {
        for (let i = 0; i < files.length; i += 100) {
          await admin!.storage.from(bucket).remove(files.slice(i, i + 100));
        }
      }
      for (const f of folders) queue.push(`${dir}/${f.name}`);
    }
  }
  await purgeBucketPrefix("appointment-photos", parsed.data.id);
  await purgeBucketPrefix("petshop-logos", parsed.data.id);

  // 2) HARD DELETE petshop. FK cascade limpa tudo no DB.
  const { error: delErr } = await admin
    .from("petshops")
    .delete()
    .eq("id", parsed.data.id);
  if (delErr) return { ok: false, error: delErr.message };

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

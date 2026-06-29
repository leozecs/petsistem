"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { getPlanLimits } from "@/lib/billing/plan-limits";

export type EmployeeFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

type TeamProfile = "attendant" | "veterinarian";

function parseSpecialties(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

// ---------------------------------------------------------------------------
// CREATE — provisions an attendant login alongside the employees row
// ---------------------------------------------------------------------------

const createSchema = z.object({
  profile: z.enum(["attendant", "veterinarian"]).default("attendant"),
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  job_title: z.string().trim().max(80).optional(),
  crmv: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "Senha precisa de pelo menos 8 caracteres").max(72),
  specialties: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

/**
 * Owner provisioning flow: creates a Supabase Auth user → users profile →
 * attendant membership on the active petshop → employees row linked back to
 * the new user.
 *
 * Idempotency-ish: if the auth user already exists for this email, we DON'T
 * resurrect them with new password; we error and ask the owner to use the
 * existing login. Same email can belong to many tenants in theory, but the
 * employees user_id unique index prevents double-bind within this petshop.
 *
 * Rollback: on any post-auth step failure, we delete the just-created auth
 * user so the owner can retry cleanly. Auth/profile/membership/employees
 * inserts are not transactional (no postgres transaction across the auth API),
 * so the compensating delete is best-effort.
 */
export async function createEmployeeWithLogin(
  formData: FormData,
): Promise<EmployeeFormState> {
  formData.set("profile", "attendant");
  return saveEmployee({ ok: false }, formData);
}

export async function createVeterinarianWithLogin(
  formData: FormData,
): Promise<EmployeeFormState> {
  formData.set("profile", "veterinarian");
  return saveEmployee({ ok: false }, formData);
}

async function createTeamMember(formData: FormData): Promise<EmployeeFormState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode cadastrar equipe." };
  }

  const raw = {
    profile: String(formData.get("profile") ?? "attendant") as TeamProfile,
    name: String(formData.get("name") ?? ""),
    job_title: String(formData.get("job_title") ?? ""),
    crmv: String(formData.get("crmv") ?? ""),
    phone: String(formData.get("phone") ?? "") || undefined,
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    specialties: parseSpecialties(String(formData.get("specialties") ?? "")),
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
  if (parsed.data.profile === "attendant" && !parsed.data.job_title) {
    return { ok: false, fieldErrors: { job_title: "Cargo obrigatório" } };
  }
  if (parsed.data.profile === "veterinarian" && !parsed.data.crmv) {
    return { ok: false, fieldErrors: { crmv: "CRMV obrigatório" } };
  }

  // Plan limit: count active memberships against plan.max_users before
  // burning an Auth user slot (criar auth + rollback é caro).
  const limits = await getPlanLimits(membership.petshopId);
  if (limits && parsed.data.profile === "veterinarian" && !limits.allowsVeterinarian) {
    return {
      ok: false,
      error: `O plano ${limits.planName} não libera Veterinários/Consultas. Troque para Profissional ou Premium.`,
    };
  }
  if (limits && limits.currentUsers >= limits.maxUsers) {
    return {
      ok: false,
      error: `Limite de ${limits.maxUsers} usuários atingido no plano ${limits.planName}. Faça upgrade do plano para adicionar mais.`,
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Service role do Supabase não configurado." };
  }

  // 1) Create auth user
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.name },
  });
  if (authErr || !created.user) {
    if (authErr?.message?.toLowerCase().includes("already")) {
      return {
        ok: false,
        fieldErrors: {
          email: "Já existe um login com esse email. Use outro ou peça pro Admin Master.",
        },
      };
    }
    return { ok: false, error: authErr?.message ?? "Falha ao criar login." };
  }
  const newUserId = created.user.id;

  async function rollbackAuth() {
    try {
      await admin!.auth.admin.deleteUser(newUserId);
    } catch {
      // Best-effort. The Admin Master can clean up later.
    }
  }

  // 2) Insert users profile (the auth trigger may not exist; insert explicitly)
  const { error: profileErr } = await admin
    .from("users")
    .insert({
      id: newUserId,
      email: parsed.data.email,
      full_name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      global_role: "user",
    });
  if (profileErr && !profileErr.message.includes("duplicate")) {
    await rollbackAuth();
    return { ok: false, error: profileErr.message };
  }

  // 3) Insert membership as attendant on the active petshop
  const { error: memErr } = await admin
    .from("memberships")
    .insert({
      petshop_id: membership.petshopId,
      user_id: newUserId,
      role: parsed.data.profile,
      status: "active",
      created_by: session.user.id,
    });
  if (memErr) {
    await rollbackAuth();
    return { ok: false, error: memErr.message };
  }

  // 4) Insert role-specific profile row linked to the new user.
  const insertResult =
    parsed.data.profile === "veterinarian"
      ? await admin
          .from("veterinarians")
          .insert({
            petshop_id: membership.petshopId,
            name: parsed.data.name,
            crmv: parsed.data.crmv ?? null,
            phone: parsed.data.phone ?? null,
            email: parsed.data.email,
            specialties: parsed.data.specialties,
            active: true,
            user_id: newUserId,
            created_by: session.user.id,
          })
          .select("id")
          .single()
      : await admin
          .from("employees")
          .insert({
            petshop_id: membership.petshopId,
            name: parsed.data.name,
            job_title: parsed.data.job_title ?? "Atendente",
            phone: parsed.data.phone ?? null,
            email: parsed.data.email,
            role: "attendant",
            active: true,
            user_id: newUserId,
            created_by: session.user.id,
          })
          .select("id")
          .single();
  if (insertResult.error) {
    await rollbackAuth();
    return { ok: false, error: insertResult.error.message };
  }

  await admin.from("audit_logs").insert({
    petshop_id: membership.petshopId,
    actor_id: session.user.id,
    action: parsed.data.profile === "veterinarian" ? "veterinarian.created" : "employee.created",
    entity_table: parsed.data.profile === "veterinarian" ? "veterinarians" : "employees",
    entity_id: insertResult.data.id,
    metadata: { user_id: newUserId, role: parsed.data.profile },
  });

  revalidatePath("/app/funcionarios");
  revalidatePath("/app/veterinarios");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// EDIT — only data fields; does not touch email/password/role
// ---------------------------------------------------------------------------

const editSchema = z.object({
  profile: z.enum(["attendant", "veterinarian"]).default("attendant"),
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Nome obrigatório").max(120),
  job_title: z.string().trim().max(80).optional(),
  crmv: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(40).optional(),
  specialties: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  active: z.boolean(),
});

export async function saveEmployee(
  _prev: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode gerenciar funcionários." };
  }
  if (!String(formData.get("id") ?? "")) {
    return createTeamMember(formData);
  }

  const raw = {
    profile: String(formData.get("profile") ?? "attendant") as TeamProfile,
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    job_title: String(formData.get("job_title") ?? ""),
    crmv: String(formData.get("crmv") ?? ""),
    phone: String(formData.get("phone") ?? "") || undefined,
    specialties: parseSpecialties(String(formData.get("specialties") ?? "")),
    active: String(formData.get("active") ?? "true") === "true",
  };

  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }
  if (parsed.data.profile === "attendant" && !parsed.data.job_title) {
    return { ok: false, fieldErrors: { job_title: "Cargo obrigatório" } };
  }
  if (parsed.data.profile === "veterinarian" && !parsed.data.crmv) {
    return { ok: false, fieldErrors: { crmv: "CRMV obrigatório" } };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { data: memberRow, error } =
    parsed.data.profile === "veterinarian"
      ? await supabase
          .from("veterinarians")
          .update({
            name: parsed.data.name,
            crmv: parsed.data.crmv ?? null,
            phone: parsed.data.phone ?? null,
            specialties: parsed.data.specialties,
            active: parsed.data.active,
            updated_by: session.user.id,
          })
          .eq("id", parsed.data.id)
          .eq("petshop_id", membership.petshopId)
          .select("user_id")
          .maybeSingle()
      : await supabase
          .from("employees")
          .update({
            name: parsed.data.name,
            job_title: parsed.data.job_title ?? "Atendente",
            phone: parsed.data.phone ?? null,
            active: parsed.data.active,
            updated_by: session.user.id,
          })
          .eq("id", parsed.data.id)
          .eq("petshop_id", membership.petshopId)
          .select("user_id")
          .maybeSingle();
  if (error) return { ok: false, error: error.message };

  // Sync membership status with employees.active. If the funcionário is
  // deactivated, the attendant login should also be suspended (status='blocked')
  // so they can't sign in. Activating brings it back.
  if (memberRow?.user_id) {
    const admin = createAdminClient();
    if (admin) {
      await admin
        .from("memberships")
        .update({
          status: parsed.data.active ? "active" : "blocked",
          updated_by: session.user.id,
        })
        .eq("user_id", memberRow.user_id)
        .eq("petshop_id", membership.petshopId);
    }
  }

  revalidatePath("/app/funcionarios");
  revalidatePath("/app/veterinarios");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// DELETE — soft-delete employee + suspend membership (login)
// ---------------------------------------------------------------------------

export async function deleteEmployee(
  id: string,
  profile: TeamProfile = "attendant",
): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode excluir funcionários." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { data: memberRow } =
    profile === "veterinarian"
      ? await supabase
          .from("veterinarians")
          .select("id, user_id")
          .eq("id", id)
          .eq("petshop_id", membership.petshopId)
          .maybeSingle()
      : await supabase
          .from("employees")
          .select("id, user_id")
          .eq("id", id)
          .eq("petshop_id", membership.petshopId)
          .maybeSingle();
  if (!memberRow) return { ok: false, error: "Membro da equipe não encontrado." };

  const payload = {
    deleted_at: new Date().toISOString(),
    deleted_by: session.user.id,
  };
  const { error } =
    profile === "veterinarian"
      ? await supabase
          .from("veterinarians")
          .update(payload)
          .eq("id", id)
          .eq("petshop_id", membership.petshopId)
          .is("deleted_at", null)
      : await supabase
          .from("employees")
          .update(payload)
          .eq("id", id)
          .eq("petshop_id", membership.petshopId)
          .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  if (memberRow.user_id) {
    const admin = createAdminClient();
    if (admin) {
      // Block the membership so the login can no longer access this tenant.
      // The auth user itself is preserved so the owner can rebind later.
      await admin
        .from("memberships")
        .update({
          status: "blocked",
          updated_by: session.user.id,
        })
        .eq("user_id", memberRow.user_id)
        .eq("petshop_id", membership.petshopId);
    }
  }

  revalidatePath("/app/funcionarios");
  revalidatePath("/app/veterinarios");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// READ — month appointments + revenue per funcionário
// ---------------------------------------------------------------------------

export type EmployeeMonthAppt = {
  id: string;
  startIso: string;
  status: string;
  serviceName: string | null;
  petName: string | null;
  tutorName: string | null;
  priceCents: number | null;
  paid: boolean;
};

export type EmployeeMonthSummary = {
  total: number;
  finished: number;
  revenueCents: number;
  pendingCents: number;
  appointments: EmployeeMonthAppt[];
};

/**
 * Read the current-month appointments served by an employee, plus aggregate
 * counters used by the drawer KPIs. Owner-only.
 */
export async function getEmployeeMonthSummary(
  employeeId: string,
  monthIso?: string,
): Promise<{ ok: true; data: EmployeeMonthSummary } | { ok: false; error: string }> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Sem permissão." };
  }
  if (!z.string().uuid().safeParse(employeeId).success) {
    return { ok: false, error: "ID inválido." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const now = new Date();
  const { year, month0 } = (() => {
    if (monthIso && /^\d{4}-\d{2}$/.test(monthIso)) {
      const [y, m] = monthIso.split("-").map(Number);
      if (y && m) return { year: y, month0: m - 1 };
    }
    return { year: now.getUTCFullYear(), month0: now.getUTCMonth() };
  })();
  const startUtc = new Date(Date.UTC(year, month0, 1));
  const endUtc = new Date(Date.UTC(year, month0 + 1, 1));

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, status, service:services(name), pet:pets(name), tutor_name, client:clients(name), charge:appointment_charges(price_cents, paid_at)",
    )
    .eq("petshop_id", membership.petshopId)
    .eq("employee_id", employeeId)
    .gte("starts_at", startUtc.toISOString())
    .lt("starts_at", endUtc.toISOString())
    .is("deleted_at", null)
    .order("starts_at", { ascending: false })
    .limit(60);
  if (error) return { ok: false, error: error.message };

  type Raw = {
    id: string;
    starts_at: string;
    status: string;
    service: { name: string } | null;
    pet: { name: string } | null;
    tutor_name: string | null;
    client: { name: string } | null;
    charge: { price_cents: number; paid_at: string | null }[] | null;
  };

  let finished = 0;
  let revenueCents = 0;
  let pendingCents = 0;
  const appointments: EmployeeMonthAppt[] = ((data ?? []) as Raw[]).map((a) => {
    const ch = a.charge?.[0];
    const paid = Boolean(ch?.paid_at);
    if (a.status === "finished") finished++;
    if (ch) {
      if (paid) revenueCents += ch.price_cents;
      else if (a.status !== "cancelled" && a.status !== "no_show") {
        pendingCents += ch.price_cents;
      }
    }
    return {
      id: a.id,
      startIso: a.starts_at,
      status: a.status,
      serviceName: a.service?.name ?? null,
      petName: a.pet?.name ?? null,
      tutorName: a.tutor_name ?? a.client?.name ?? null,
      priceCents: ch?.price_cents ?? null,
      paid,
    };
  });

  return {
    ok: true,
    data: {
      total: appointments.length,
      finished,
      revenueCents,
      pendingCents,
      appointments,
    },
  };
}

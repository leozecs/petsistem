"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";

export type VetFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseSpecialties(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// CREATE — provisions a veterinarian login alongside the row
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  crmv: z.string().trim().min(1, "CRMV obrigatório").max(40),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "Senha precisa de pelo menos 8 caracteres").max(72),
  specialties: z.array(z.string().trim().min(1).max(40)).max(20),
});

/**
 * Mirror of employees provisioning: creates Auth user → users → membership
 * (role='veterinarian') → veterinarians row linked back. Rollback best-effort.
 */
export async function createVeterinarianWithLogin(
  formData: FormData,
): Promise<VetFormState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode cadastrar veterinários." };
  }

  const raw = {
    name: String(formData.get("name") ?? ""),
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

  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Service role do Supabase não configurado." };
  }

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
      /* best-effort */
    }
  }

  const { error: profileErr } = await admin.from("users").insert({
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

  const { error: memErr } = await admin.from("memberships").insert({
    petshop_id: membership.petshopId,
    user_id: newUserId,
    role: "veterinarian",
    status: "active",
    created_by: session.user.id,
  });
  if (memErr) {
    await rollbackAuth();
    return { ok: false, error: memErr.message };
  }

  const supabase = await createClient();
  if (!supabase) {
    await rollbackAuth();
    return { ok: false, error: "Supabase indisponível." };
  }
  const { error: vetErr } = await supabase.from("veterinarians").insert({
    petshop_id: membership.petshopId,
    name: parsed.data.name,
    crmv: parsed.data.crmv,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email,
    specialties: parsed.data.specialties,
    active: true,
    user_id: newUserId,
    created_by: session.user.id,
  });
  if (vetErr) {
    await rollbackAuth();
    return { ok: false, error: vetErr.message };
  }

  revalidatePath("/app/veterinarios");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// EDIT — only data fields; does not touch email/password
// ---------------------------------------------------------------------------

const editSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Nome obrigatório").max(120),
  crmv: z.string().trim().min(1, "CRMV obrigatório").max(40),
  phone: z.string().trim().max(40).optional(),
  specialties: z.array(z.string().trim().min(1).max(40)).max(20),
  active: z.boolean(),
});

export async function saveVeterinarian(
  _prev: VetFormState,
  formData: FormData,
): Promise<VetFormState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode gerenciar veterinários." };
  }

  const raw = {
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
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

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("veterinarians")
    .update({
      name: parsed.data.name,
      crmv: parsed.data.crmv,
      phone: parsed.data.phone ?? null,
      specialties: parsed.data.specialties,
      active: parsed.data.active,
      updated_by: session.user.id,
    })
    .eq("id", parsed.data.id)
    .eq("petshop_id", membership.petshopId);
  if (error) return { ok: false, error: error.message };

  // Sync membership status with vet.active.
  const { data: vet } = await supabase
    .from("veterinarians")
    .select("user_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (vet?.user_id) {
    const admin = createAdminClient();
    if (admin) {
      await admin
        .from("memberships")
        .update({
          status: parsed.data.active ? "active" : "blocked",
          updated_by: session.user.id,
        })
        .eq("user_id", vet.user_id)
        .eq("petshop_id", membership.petshopId);
    }
  }

  revalidatePath("/app/veterinarios");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function deleteVeterinarian(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode excluir veterinários." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { data: vet } = await supabase
    .from("veterinarians")
    .select("id, user_id")
    .eq("id", id)
    .eq("petshop_id", membership.petshopId)
    .maybeSingle();
  if (!vet) return { ok: false, error: "Veterinário não encontrado." };

  const { error } = await supabase
    .from("veterinarians")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: session.user.id,
    })
    .eq("id", id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  if (vet.user_id) {
    const admin = createAdminClient();
    if (admin) {
      await admin
        .from("memberships")
        .update({ status: "blocked", updated_by: session.user.id })
        .eq("user_id", vet.user_id)
        .eq("petshop_id", membership.petshopId);
    }
  }

  revalidatePath("/app/veterinarios");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// READ — month appointments + revenue per vet
// ---------------------------------------------------------------------------

export type VetMonthAppt = {
  id: string;
  startIso: string;
  status: string;
  serviceName: string | null;
  petName: string | null;
  tutorName: string | null;
  priceCents: number | null;
  paid: boolean;
};

export type VetMonthSummary = {
  total: number;
  finished: number;
  revenueCents: number;
  pendingCents: number;
  appointments: VetMonthAppt[];
};

export async function getVeterinarianMonthSummary(
  vetId: string,
  monthIso?: string,
): Promise<{ ok: true; data: VetMonthSummary } | { ok: false; error: string }> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Sem permissão." };
  }
  if (!z.string().uuid().safeParse(vetId).success) {
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
    .eq("veterinarian_id", vetId)
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
  const appointments: VetMonthAppt[] = ((data ?? []) as Raw[]).map((a) => {
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

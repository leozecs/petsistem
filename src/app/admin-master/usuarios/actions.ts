"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

export type ActionState = { ok: boolean; error?: string };

async function requireAdminMaster() {
  const session = await getSession();
  if (!session || session.user.globalRole !== "admin_master") return null;
  return session.user;
}

// ---------------------------------------------------------------------------
// RESET PASSWORD — generates random password, updates auth user, returns it
// to be shown once in the UI (admin must hand it to the user out-of-band).
// ---------------------------------------------------------------------------

function generatePassword(length = 14): string {
  // Avoid ambiguous chars (O/0, l/1, I) so the admin can dictate the value.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  // crypto.getRandomValues guarantees CSPRNG output.
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  for (let i = 0; i < length; i++) {
    out += chars[buf[i]! % chars.length];
  }
  return out;
}

export async function resetUserPassword(
  userId: string,
): Promise<{ ok: true; password: string } | { ok: false; error: string }> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  if (!z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: "ID inválido." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const password = generatePassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin-master/usuarios");
  return { ok: true, password };
}

// ---------------------------------------------------------------------------
// BLOCK / UNBLOCK MEMBERSHIP — per-tenant; a user can be active in one shop
// and blocked in another.
// ---------------------------------------------------------------------------

const statusSchema = z.object({
  membershipId: z.string().uuid(),
  status: z.enum(["active", "blocked"] as const),
});

export async function setMembershipStatus(
  membershipId: string,
  status: "active" | "blocked",
): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };

  const parsed = statusSchema.safeParse({ membershipId, status });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { error } = await admin
    .from("memberships")
    .update({ status: parsed.data.status, updated_by: me.id })
    .eq("id", parsed.data.membershipId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin-master/usuarios");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// USER DETAILS (drawer) — list memberships with petshop info
// ---------------------------------------------------------------------------

export type MembershipDetail = {
  membershipId: string;
  petshopId: string;
  petshopName: string;
  petshopSubdomain: string;
  role: string;
  status: string;
};

export async function getUserMemberships(
  userId: string,
): Promise<
  | { ok: true; data: MembershipDetail[] }
  | { ok: false; error: string }
> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  if (!z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: "ID inválido." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { data, error } = await admin
    .from("memberships")
    .select(
      "id, role, status, petshop:petshops(id, name, subdomain)",
    )
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };

  type Raw = {
    id: string;
    role: string;
    status: string;
    petshop: { id: string; name: string; subdomain: string } | null;
  };

  const details: MembershipDetail[] = ((data ?? []) as Raw[])
    .filter((m) => m.petshop !== null)
    .map((m) => ({
      membershipId: m.id,
      petshopId: m.petshop!.id,
      petshopName: m.petshop!.name,
      petshopSubdomain: m.petshop!.subdomain,
      role: m.role,
      status: m.status,
    }));

  return { ok: true, data: details };
}

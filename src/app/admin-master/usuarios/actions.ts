"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

export type ActionState = { ok: boolean; error?: string; warning?: string };

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
// DELETE USER — removes app access and soft-deletes the Supabase Auth user.
// Operational records and audit history are preserved.
// ---------------------------------------------------------------------------

export async function deleteUser(userId: string): Promise<ActionState> {
  const me = await requireAdminMaster();
  if (!me) return { ok: false, error: "Apenas Admin Master." };
  if (!z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: "ID inválido." };
  }
  if (userId === me.id) {
    return { ok: false, error: "Você não pode excluir o próprio usuário." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const { data: target, error: targetError } = await admin
    .from("users")
    .select("id, email, full_name, global_role, deleted_at")
    .eq("id", userId)
    .maybeSingle();
  if (targetError) return { ok: false, error: targetError.message };
  if (!target) return { ok: false, error: "Usuário não encontrado." };
  if (target.global_role === "admin_master") {
    return { ok: false, error: "Usuários Admin Master não podem ser excluídos por esta tela." };
  }

  const { data: ownerMemberships, error: ownerMembershipsError } = await admin
    .from("memberships")
    .select("petshop_id, petshop:petshops(name)")
    .eq("user_id", userId)
    .eq("role", "owner")
    .eq("status", "active")
    .is("deleted_at", null);
  if (ownerMembershipsError) {
    return { ok: false, error: ownerMembershipsError.message };
  }

  type OwnerMembership = {
    petshop_id: string;
    petshop: { name: string } | null;
  };
  const ownedShops = (ownerMemberships ?? []) as OwnerMembership[];

  if (ownedShops.length > 0) {
    const petshopIds = [...new Set(ownedShops.map((membership) => membership.petshop_id))];
    const { data: otherOwners, error: otherOwnersError } = await admin
      .from("memberships")
      .select("petshop_id")
      .in("petshop_id", petshopIds)
      .eq("role", "owner")
      .eq("status", "active")
      .neq("user_id", userId)
      .is("deleted_at", null);
    if (otherOwnersError) return { ok: false, error: otherOwnersError.message };

    const shopsWithAnotherOwner = new Set((otherOwners ?? []).map((row) => row.petshop_id));
    const orphanedShopNames = ownedShops
      .filter((membership) => !shopsWithAnotherOwner.has(membership.petshop_id))
      .map((membership) => membership.petshop?.name ?? membership.petshop_id);

    if (orphanedShopNames.length > 0) {
      return {
        ok: false,
        error: `Defina outro dono antes de excluir este usuário: ${orphanedShopNames.join(", ")}.`,
      };
    }
  }

  const deletedAt = new Date().toISOString();

  if (!target.deleted_at) {
    const { error: membershipsError } = await admin
      .from("memberships")
      .update({
        status: "suspended",
        deleted_at: deletedAt,
        deleted_by: me.id,
        updated_by: me.id,
      })
      .eq("user_id", userId)
      .is("deleted_at", null);
    if (membershipsError) return { ok: false, error: membershipsError.message };

    const { error: userError } = await admin
      .from("users")
      .update({ deleted_at: deletedAt, deleted_by: me.id, updated_by: me.id })
      .eq("id", userId);
    if (userError) return { ok: false, error: userError.message };
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    petshop_id: null,
    actor_id: me.id,
    action: "user.delete",
    entity_table: "users",
    entity_id: userId,
    metadata: {
      target_email: target.email,
      target_name: target.full_name,
      auth_delete: "soft",
    },
  });
  if (auditError) {
    return { ok: false, error: `Acesso removido, mas o log de auditoria falhou: ${auditError.message}` };
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId, true);
  if (authError) {
    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (banError) {
      return {
        ok: false,
        error: "O usuário foi removido do app, mas não foi possível excluir nem bloquear o login no Auth.",
      };
    }

    revalidatePath("/admin-master/usuarios");
    return {
      ok: true,
      warning: "Usuário removido do sistema e bloqueado no Auth; a exclusão física ficou pendente.",
    };
  }

  revalidatePath("/admin-master/usuarios");
  return { ok: true };
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

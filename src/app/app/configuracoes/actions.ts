"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import { isPetshopTimeZone } from "@/lib/timezones";
import {
  detectPetshopLogoExtension,
  getPetshopLogoExtension,
  isTenantPetshopLogoPath,
  MAX_PETSHOP_LOGO_BYTES,
  PETSHOP_LOGO_BUCKET,
  PETSHOP_LOGO_MIME_TYPES,
} from "@/lib/storage/petshop-logo";

export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const generalSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  legal_name: z.string().trim().max(200).optional(),
  address: z.string().trim().max(2000).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  email: z
    .union([z.literal(""), z.string().trim().email("Email inválido")])
    .optional(),
});

export async function updatePetshopGeneral(
  formData: FormData,
): Promise<ActionState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode editar." };
  }

  const parsed = generalSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    legal_name: String(formData.get("legal_name") ?? "") || undefined,
    address: String(formData.get("address") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    whatsapp: String(formData.get("whatsapp") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
  });
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
    .from("petshops")
    .update({
      name: parsed.data.name,
      legal_name: parsed.data.legal_name ?? null,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      whatsapp: parsed.data.whatsapp ?? null,
      email: parsed.data.email || null,
      updated_by: session.user.id,
    })
    .eq("id", membership.petshopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/configuracoes");
  revalidatePath("/app");
  return { ok: true };
}

const visualSchema = z.object({
  primary_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato #RRGGBB"),
});

export async function updatePetshopVisual(
  formData: FormData,
): Promise<ActionState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode editar." };
  }

  const parsed = visualSchema.safeParse({
    primary_color: String(formData.get("primary_color") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("petshops")
    .update({
      primary_color: parsed.data.primary_color,
      updated_by: session.user.id,
    })
    .eq("id", membership.petshopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/configuracoes");
  revalidatePath("/app");
  return { ok: true };
}

const operationsSchema = z.object({
  slot_minutes: z.coerce.number().int().refine((n) => [15, 20, 30, 45, 60].includes(n), {
    message: "Intervalo deve ser 15, 20, 30, 45 ou 60 minutos.",
  }),
  timezone: z.string().refine(isPetshopTimeZone, "Fuso horário inválido."),
});

/**
 * Edita o intervalo (gap) entre agendamentos. Afeta tanto a geração de slots
 * no calendário quanto a validação de duração no saveAppointment/reschedule.
 * Default 30 (mantém comportamento histórico). Owner only.
 */
export async function updatePetshopOperations(
  formData: FormData,
): Promise<ActionState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode editar." };
  }

  const parsed = operationsSchema.safeParse({
    slot_minutes: formData.get("slot_minutes"),
    timezone: String(formData.get("timezone") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("petshops")
    .update({
      slot_minutes: parsed.data.slot_minutes,
      timezone: parsed.data.timezone,
      updated_by: session.user.id,
    })
    .eq("id", membership.petshopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/configuracoes");
  revalidatePath("/app/calendarios");
  return { ok: true };
}

const prepareLogoUploadSchema = z.object({
  fileSize: z.number().int().positive().max(MAX_PETSHOP_LOGO_BYTES),
  mimeType: z.enum(PETSHOP_LOGO_MIME_TYPES),
});

const completeLogoUploadSchema = z.object({
  path: z.string().trim().min(1).max(200),
});

type LogoUploadError = { ok: false; error: string };

/**
 * Autoriza um upload curto e tenant-scoped. O binário vai direto do navegador
 * ao Supabase Storage, evitando o limite de body das Server Actions da Vercel.
 */
export async function preparePetshopLogoUpload(input: {
  fileSize: number;
  mimeType: string;
}): Promise<
  | { ok: true; path: string; token: string }
  | LogoUploadError
> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode trocar a logo." };
  }

  const parsed = prepareLogoUploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Arquivo inválido. Use PNG, JPG ou WEBP com até 2MB.",
    };
  }

  const extension = getPetshopLogoExtension(parsed.data.mimeType);
  if (!extension) {
    return { ok: false, error: "Formato não suportado. Use PNG, JPG ou WEBP." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Upload temporariamente indisponível." };

  const path = `${membership.petshopId}/logo-${randomUUID()}.${extension}`;
  const { data, error } = await admin.storage
    .from(PETSHOP_LOGO_BUCKET)
    .createSignedUploadUrl(path);

  if (error) {
    console.error(JSON.stringify({
      level: "error",
      msg: "petshop_logo.prepare_failed",
      petshopId: membership.petshopId,
      error: error.message,
    }));
    return { ok: false, error: "Não foi possível preparar o upload da logo." };
  }

  return { ok: true, path, token: data.token };
}

/**
 * Confirma o upload depois que o Storage recebeu o arquivo. Revalida tenant,
 * owner, path, tamanho e assinatura binária antes de persistir a nova URL.
 */
export async function completePetshopLogoUpload(input: {
  path: string;
}): Promise<
  | { ok: true; path: string; url: string }
  | LogoUploadError
> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode trocar a logo." };
  }

  const parsed = completeLogoUploadSchema.safeParse(input);
  if (
    !parsed.success ||
    !isTenantPetshopLogoPath(parsed.data.path, membership.petshopId)
  ) {
    return { ok: false, error: "Upload de logo inválido." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Upload temporariamente indisponível." };

  const path = parsed.data.path;
  const expectedExtension = path.split(".").pop();
  const { data: fileInfo, error: infoError } = await admin.storage
    .from(PETSHOP_LOGO_BUCKET)
    .info(path);
  if (
    infoError ||
    typeof fileInfo.size !== "number" ||
    fileInfo.size <= 0 ||
    fileInfo.size > MAX_PETSHOP_LOGO_BYTES
  ) {
    await admin.storage.from(PETSHOP_LOGO_BUCKET).remove([path]);
    return { ok: false, error: "O arquivo enviado excede o limite permitido." };
  }

  const { data: uploadedFile, error: downloadError } = await admin.storage
    .from(PETSHOP_LOGO_BUCKET)
    .download(path);

  if (downloadError) {
    await admin.storage.from(PETSHOP_LOGO_BUCKET).remove([path]);
    return { ok: false, error: "A logo não foi encontrada no Storage." };
  }

  const bytes = new Uint8Array(await uploadedFile.arrayBuffer());
  const detectedExtension = detectPetshopLogoExtension(bytes);
  if (
    bytes.byteLength > MAX_PETSHOP_LOGO_BYTES ||
    detectedExtension === null ||
    detectedExtension !== expectedExtension
  ) {
    await admin.storage.from(PETSHOP_LOGO_BUCKET).remove([path]);
    return { ok: false, error: "O arquivo enviado não é uma imagem válida." };
  }

  const supabase = await createClient();
  if (!supabase) {
    await admin.storage.from(PETSHOP_LOGO_BUCKET).remove([path]);
    return { ok: false, error: "Supabase indisponível." };
  }
  const { data: current, error: currentError } = await supabase
    .from("petshops")
    .select("logo_path")
    .eq("id", membership.petshopId)
    .maybeSingle();
  if (currentError) {
    await admin.storage.from(PETSHOP_LOGO_BUCKET).remove([path]);
    return { ok: false, error: "Não foi possível consultar a logo atual." };
  }
  const oldPath = current?.logo_path;

  const { error: updateErr } = await supabase
    .from("petshops")
    .update({ logo_path: path, updated_by: session.user.id })
    .eq("id", membership.petshopId);
  if (updateErr) {
    await admin.storage.from(PETSHOP_LOGO_BUCKET).remove([path]);
    return { ok: false, error: "Não foi possível salvar a nova logo." };
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    petshop_id: membership.petshopId,
    actor_id: session.user.id,
    action: "petshop.logo.update",
    entity_table: "petshops",
    entity_id: membership.petshopId,
    metadata: { previous_path: oldPath ?? null, new_path: path },
  });

  if (auditError) {
    const { error: rollbackError } = await admin
      .from("petshops")
      .update({ logo_path: oldPath ?? null, updated_by: session.user.id })
      .eq("id", membership.petshopId);
    await admin.storage.from(PETSHOP_LOGO_BUCKET).remove([path]);
    console.error(JSON.stringify({
      level: "error",
      msg: "petshop_logo.audit_failed",
      petshopId: membership.petshopId,
      auditError: auditError.message,
      rollbackError: rollbackError?.message,
    }));
    return { ok: false, error: "Não foi possível auditar a troca da logo." };
  }

  if (oldPath && oldPath !== path) {
    const { error: cleanupError } = await admin.storage
      .from(PETSHOP_LOGO_BUCKET)
      .remove([oldPath]);
    if (cleanupError) {
      console.warn(JSON.stringify({
        level: "warn",
        msg: "petshop_logo.old_file_cleanup_failed",
        petshopId: membership.petshopId,
        error: cleanupError.message,
      }));
    }
  }

  const { data: pub } = admin.storage.from(PETSHOP_LOGO_BUCKET).getPublicUrl(path);

  revalidatePath("/app/configuracoes");
  revalidatePath("/app");
  return { ok: true, path, url: pub.publicUrl };
}

export async function removePetshopLogo(): Promise<ActionState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode remover a logo." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  // Tenta remover o objeto se existir. Se já não houver, ignore.
  const { data: petshop } = await admin
    .from("petshops")
    .select("logo_path")
    .eq("id", membership.petshopId)
    .maybeSingle();
  if (petshop?.logo_path) {
    await admin.storage.from("petshop-logos").remove([petshop.logo_path]);
  }

  const { error } = await supabase
    .from("petshops")
    .update({ logo_path: null, updated_by: session.user.id })
    .eq("id", membership.petshopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/configuracoes");
  revalidatePath("/app");
  return { ok: true };
}

const deleteAccountSchema = z.object({
  confirm_subdomain: z.string().trim().min(1),
});

async function purgeBucketPrefix(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  bucket: string,
  prefix: string,
) {
  const queue: string[] = [prefix];
  while (queue.length > 0) {
    const dir = queue.shift()!;
    const { data: items, error: listError } = await admin.storage
      .from(bucket)
      .list(dir, { limit: 1000 });
    if (listError) throw new Error(listError.message);
    if (!items || items.length === 0) continue;

    const files = items
      .filter((item) => item.id !== null)
      .map((item) => `${dir}/${item.name}`);
    const folders = items.filter((item) => item.id === null);

    for (let i = 0; i < files.length; i += 100) {
      const { error: removeError } = await admin.storage
        .from(bucket)
        .remove(files.slice(i, i + 100));
      if (removeError) throw new Error(removeError.message);
    }
    for (const folder of folders) queue.push(`${dir}/${folder.name}`);
  }
}

/**
 * HARD DELETE self-service da loja ativa. Owner only.
 *
 * Segurança:
 * - Usa `requireTenant` + role owner.
 * - Confirma subdomínio exato antes de qualquer mutação.
 * - Todas as queries são escopadas ao `membership.petshopId`.
 * - Deleta Auth apenas de usuários sem outra membership e sem global_role admin.
 * - Registra auditoria global sem `petshop_id`, pois a loja será apagada.
 */
export async function deleteOwnPetshopAccount(input: {
  confirm_subdomain: string;
}): Promise<ActionState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode excluir a conta da loja." };
  }

  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Confirmação inválida." };

  const expected = membership.petshop.subdomain.trim().toLowerCase();
  if (parsed.data.confirm_subdomain.trim().toLowerCase() !== expected) {
    return {
      ok: false,
      error: `Digite exatamente "${membership.petshop.subdomain}" para confirmar.`,
    };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const petshopId = membership.petshopId;

  const { data: shop } = await admin
    .from("petshops")
    .select("id, name, subdomain")
    .eq("id", petshopId)
    .maybeSingle();
  if (!shop) return { ok: false, error: "Loja não encontrada." };

  const { data: memberRows } = await admin
    .from("memberships")
    .select("user_id")
    .eq("petshop_id", petshopId)
    .is("deleted_at", null);

  const userIds = Array.from(new Set((memberRows ?? []).map((row) => row.user_id).filter(Boolean)));
  const authUsersToDelete: string[] = [];

  for (const userId of userIds) {
    const [{ data: profile }, { count: otherMemberships }] = await Promise.all([
      admin.from("users").select("global_role").eq("id", userId).maybeSingle(),
      admin
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .neq("petshop_id", petshopId)
        .is("deleted_at", null),
    ]);

    if (profile?.global_role !== "admin_master" && (otherMemberships ?? 0) === 0) {
      authUsersToDelete.push(userId);
    }
  }

  await admin.from("audit_logs").insert({
    petshop_id: null,
    actor_id: session.user.id,
    action: "petshop.self_delete.requested",
    entity_table: "petshops",
    entity_id: petshopId,
    metadata: {
      petshop_id: petshopId,
      subdomain: shop.subdomain,
      name: shop.name,
      auth_users_to_delete: authUsersToDelete.length,
    },
  });

  try {
    await purgeBucketPrefix(admin, "appointment-photos", petshopId);
    await purgeBucketPrefix(admin, "petshop-logos", petshopId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao apagar arquivos da loja.",
    };
  }

  const { error: deleteError } = await admin
    .from("petshops")
    .delete()
    .eq("id", petshopId);
  if (deleteError) return { ok: false, error: deleteError.message };

  for (const userId of authUsersToDelete) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.warn(JSON.stringify({
        level: "warn",
        msg: "petshop_self_delete.auth_delete_failed",
        petshopId,
        userId,
        error: error.message,
      }));
    }
  }

  revalidatePath("/app");
  return { ok: true };
}

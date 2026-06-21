"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";

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

const uploadLogoSchema = z.object({
  petshop_id: z.string().uuid(),
  ext: z.enum(["png", "jpg", "jpeg", "webp", "svg"]),
});

/**
 * Recebe um base64 da imagem e sobe pro bucket `petshop-logos`. Path:
 * `<petshop_id>/logo.<ext>`. Usa admin client pra autoridade — a RLS do bucket
 * já restringe path por petshop, mas a action também valida que o caller é
 * dono pra evitar abuso por usuário malicioso conhecedor de outro petshop_id.
 *
 * Limite de tamanho: ~2MB. Maior que isso recusamos pra não inflar conta de
 * egress nem encher Storage.
 */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function uploadPetshopLogo(formData: FormData): Promise<
  | { ok: true; path: string; url: string }
  | { ok: false; error: string }
> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode trocar a logo." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Arquivo não enviado." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "Arquivo grande demais. Máximo 2MB." };
  }
  const extRaw = (file.name.split(".").pop() ?? "").toLowerCase();
  const parsed = uploadLogoSchema.safeParse({
    petshop_id: membership.petshopId,
    ext: extRaw === "jpeg" ? "jpg" : extRaw,
  });
  if (!parsed.success) {
    return { ok: false, error: "Formato não suportado. Use PNG, JPG, WEBP ou SVG." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Service role indisponível." };

  const path = `${parsed.data.petshop_id}/logo.${parsed.data.ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from("petshop-logos")
    .upload(path, buffer, {
      contentType: file.type || `image/${parsed.data.ext}`,
      upsert: true,
    });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  // Atualiza logo_path no petshop pra o cache de leitura saber qual extensão.
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };
  const { error: updateErr } = await supabase
    .from("petshops")
    .update({ logo_path: path, updated_by: session.user.id })
    .eq("id", membership.petshopId);
  if (updateErr) return { ok: false, error: updateErr.message };

  // Public URL pra preview imediato no client.
  const { data: pub } = admin.storage.from("petshop-logos").getPublicUrl(path);

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

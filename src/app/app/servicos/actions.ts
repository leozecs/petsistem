"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";

const serviceSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  area: z.enum(["grooming", "veterinary"]),
  name: z.string().trim().min(1, "Nome obrigatório"),
  description: z.string().trim().optional(),
  duration_minutes: z.coerce.number().int().positive("Duração inválida").max(720),
  price_cents: z.coerce.number().int().min(0, "Preço inválido"),
  active: z.boolean(),
});

export type ServiceFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function saveService(_prev: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode gerenciar serviços." };
  }

  // Price comes from UI as R$ X,XX — normalize to cents.
  const priceRaw = String(formData.get("price_brl") ?? "")
    .replace(/[^0-9.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const priceCents = Math.round(Number(priceRaw || "0") * 100);

  const raw = {
    id: String(formData.get("id") ?? "") || undefined,
    area: String(formData.get("area") ?? "grooming") as "grooming" | "veterinary",
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    duration_minutes: Number(formData.get("duration_minutes") ?? 0),
    price_cents: priceCents,
    active: String(formData.get("active") ?? "true") === "true",
  };

  const parsed = serviceSchema.safeParse(raw);
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

  const payload = {
    petshop_id: membership.petshopId,
    area: parsed.data.area,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    duration_minutes: parsed.data.duration_minutes,
    price_cents: parsed.data.price_cents,
    active: parsed.data.active,
  };

  if (parsed.data.id) {
    const { error } = await supabase
      .from("services")
      .update({ ...payload, updated_by: session.user.id })
      .eq("id", parsed.data.id)
      .eq("petshop_id", membership.petshopId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("services")
      .insert({ ...payload, created_by: session.user.id });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/app/servicos");
  return { ok: true };
}

export async function deleteService(id: string): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode excluir serviços." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("services")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: session.user.id,
    })
    .eq("id", id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/servicos");
  return { ok: true };
}

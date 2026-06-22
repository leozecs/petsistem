"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";

const PAYMENT_METHOD = z.enum(["pix", "cash", "card", "transfer", "other"]);

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createRevenueSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1, "Descrição obrigatória.").max(200),
  amount_cents: z.number().int().min(1, "Valor obrigatório."),
  payment_method: PAYMENT_METHOD,
  received_at: z.string().regex(dateRegex),
  notes: z.string().trim().max(500).optional(),
});

const createExpenseSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1).max(200),
  amount_cents: z.number().int().min(1),
  payment_method: PAYMENT_METHOD.optional(),
  due_date: z.string().regex(dateRegex),
  paid_at: z.string().regex(dateRegex).nullable().optional(),
  notes: z.string().trim().max(500).optional(),
});

const idSchema = z.object({ id: z.string().uuid() });

type Result = { ok: true } | { ok: false; error: string };

export async function createRevenueItem(
  input: z.infer<typeof createRevenueSchema>,
): Promise<Result> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) {
    return { ok: false, error: "Sem permissão." };
  }

  const parsed = createRevenueSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  // Confirm category belongs to this tenant when provided.
  if (parsed.data.category_id) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id, kind, active")
      .eq("id", parsed.data.category_id)
      .eq("petshop_id", membership.petshopId)
      .maybeSingle();
    if (!cat || cat.kind !== "revenue" || !cat.active) {
      return { ok: false, error: "Categoria inválida." };
    }
  }

  const { error } = await supabase.from("revenue_items").insert({
    petshop_id: membership.petshopId,
    category_id: parsed.data.category_id ?? null,
    description: parsed.data.description,
    amount_cents: parsed.data.amount_cents,
    payment_method: parsed.data.payment_method,
    received_at: parsed.data.received_at,
    notes: parsed.data.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/financeiro");
  return { ok: true };
}

export async function createExpenseItem(
  input: z.infer<typeof createExpenseSchema>,
): Promise<Result> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) {
    return { ok: false, error: "Sem permissão." };
  }

  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  if (parsed.data.category_id) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id, kind, active")
      .eq("id", parsed.data.category_id)
      .eq("petshop_id", membership.petshopId)
      .maybeSingle();
    if (!cat || cat.kind !== "expense" || !cat.active) {
      return { ok: false, error: "Categoria inválida." };
    }
  }

  const { error } = await supabase.from("expenses").insert({
    petshop_id: membership.petshopId,
    category_id: parsed.data.category_id ?? null,
    category: "other",
    description: parsed.data.description,
    amount_cents: parsed.data.amount_cents,
    payment_method: parsed.data.payment_method ?? null,
    due_date: parsed.data.due_date,
    paid_at: parsed.data.paid_at ?? null,
    notes: parsed.data.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/financeiro");
  return { ok: true };
}

export async function deleteRevenueItem(input: { id: string }): Promise<Result> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) return { ok: false, error: "Sem permissão." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ID inválido." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  // Soft delete with audit
  const { error } = await supabase
    .from("revenue_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("petshop_id", membership.petshopId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/financeiro");
  return { ok: true };
}

export async function deleteExpenseItem(input: { id: string }): Promise<Result> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) return { ok: false, error: "Sem permissão." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ID inválido." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("petshop_id", membership.petshopId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/financeiro");
  return { ok: true };
}

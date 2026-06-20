"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";
import type { Database } from "@/lib/supabase/database.types";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

const PAYMENT_METHODS: PaymentMethod[] = ["pix", "cash", "card", "transfer", "other"];

const markPaidSchema = z.object({
  appointment_id: z.string().uuid(),
  method: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
});

export async function markChargePaid(
  appointmentId: string,
  method: PaymentMethod,
): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) {
    return { ok: false, error: "Sem permissão." };
  }
  const parsed = markPaidSchema.safeParse({ appointment_id: appointmentId, method });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("appointment_charges")
    .update({
      payment_method: parsed.data.method,
      paid_at: new Date().toISOString(),
      paid_by: session.user.id,
      updated_by: session.user.id,
    })
    .eq("appointment_id", parsed.data.appointment_id)
    .eq("petshop_id", membership.petshopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/caixa");
  revalidatePath("/app/calendarios");
  return { ok: true };
}

export async function unmarkChargePaid(
  appointmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) {
    return { ok: false, error: "Sem permissão." };
  }
  if (!z.string().uuid().safeParse(appointmentId).success) {
    return { ok: false, error: "ID inválido." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("appointment_charges")
    .update({
      payment_method: null,
      paid_at: null,
      paid_by: null,
      updated_by: session.user.id,
    })
    .eq("appointment_id", appointmentId)
    .eq("petshop_id", membership.petshopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/caixa");
  return { ok: true };
}

const expenseSchema = z.object({
  description: z.string().trim().min(1, "Descrição obrigatória").max(200),
  amount_cents: z.coerce.number().int().positive("Valor inválido"),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  payment_method: z
    .enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]])
    .optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function saveExpense(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner", "attendant"])) {
    return { ok: false, error: "Sem permissão." };
  }

  const raw = {
    description: String(formData.get("description") ?? ""),
    amount_cents: String(formData.get("amount_cents") ?? "0"),
    occurred_on: String(formData.get("occurred_on") ?? ""),
    payment_method: (String(formData.get("payment_method") ?? "") ||
      undefined) as PaymentMethod | undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  };

  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  // expenses table has a required category column from a prior migration; the
  // simplified UI in /app/caixa doesn't expose it, so we default to 'other'.
  const { error } = await supabase.from("expenses").insert({
    petshop_id: membership.petshopId,
    category: "other",
    description: parsed.data.description,
    amount_cents: parsed.data.amount_cents,
    due_date: parsed.data.occurred_on,
    paid_at: parsed.data.occurred_on,
    payment_method: parsed.data.payment_method ?? null,
    notes: parsed.data.notes ?? null,
    created_by: session.user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/caixa");
  revalidatePath("/app/relatorios");
  return { ok: true };
}

export async function deleteExpense(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Sem permissão para excluir despesa." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("expenses")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: session.user.id,
    })
    .eq("id", id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/caixa");
  revalidatePath("/app/relatorios");
  return { ok: true };
}

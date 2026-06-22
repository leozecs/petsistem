"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";

const KIND = z.enum(["revenue", "expense"]);

const createSchema = z.object({
  kind: KIND,
  name: z.string().trim().min(1, "Nome obrigatório.").max(60),
  description: z.string().trim().max(200).optional(),
  position: z.number().int().min(0).max(999).optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).optional(),
  position: z.number().int().min(0).max(999).optional(),
});

const idSchema = z.object({ id: z.string().uuid() });

type Result = { ok: true } | { ok: false; error: string };

export async function createCategory(input: z.infer<typeof createSchema>): Promise<Result> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) return { ok: false, error: "Sem permissão." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase.from("categories").insert({
    petshop_id: membership.petshopId,
    kind: parsed.data.kind,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    position: parsed.data.position ?? 50,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe categoria ativa com esse nome." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/app/configuracoes/categorias");
  revalidatePath("/app/financeiro");
  return { ok: true };
}

export async function updateCategory(input: z.infer<typeof updateSchema>): Promise<Result> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) return { ok: false, error: "Sem permissão." };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const update: {
    name: string;
    description: string | null;
    position?: number;
  } = {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
  };
  if (parsed.data.position !== undefined) update.position = parsed.data.position;

  const { error } = await supabase
    .from("categories")
    .update(update)
    .eq("id", parsed.data.id)
    .eq("petshop_id", membership.petshopId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe categoria ativa com esse nome." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/app/configuracoes/categorias");
  revalidatePath("/app/financeiro");
  return { ok: true };
}

/**
 * Soft delete: marca active=false em vez de remover. Preserva FK em expenses/
 * revenue_items históricos (relatório de mês anterior segue mostrando categoria).
 */
export async function archiveCategory(input: { id: string }): Promise<Result> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) return { ok: false, error: "Sem permissão." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ID inválido." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("categories")
    .update({ active: false })
    .eq("id", parsed.data.id)
    .eq("petshop_id", membership.petshopId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/configuracoes/categorias");
  revalidatePath("/app/financeiro");
  return { ok: true };
}

export async function restoreCategory(input: { id: string }): Promise<Result> {
  const { membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) return { ok: false, error: "Sem permissão." };

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ID inválido." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("categories")
    .update({ active: true })
    .eq("id", parsed.data.id)
    .eq("petshop_id", membership.petshopId);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Já existe outra categoria ativa com esse nome. Renomeie primeiro.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/app/configuracoes/categorias");
  revalidatePath("/app/financeiro");
  return { ok: true };
}

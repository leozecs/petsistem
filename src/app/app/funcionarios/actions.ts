"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, hasRole } from "@/lib/auth/require-tenant";

const employeeSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Nome obrigatório"),
  job_title: z.string().trim().min(1, "Cargo obrigatório"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  role: z.enum(["owner", "attendant", "veterinarian"]),
  active: z.boolean(),
});

export type EmployeeFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function saveEmployee(_prev: EmployeeFormState, formData: FormData): Promise<EmployeeFormState> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode gerenciar funcionários." };
  }

  const raw = {
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    job_title: String(formData.get("job_title") ?? ""),
    phone: String(formData.get("phone") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    role: String(formData.get("role") ?? "attendant") as "owner" | "attendant" | "veterinarian",
    active: String(formData.get("active") ?? "true") === "true",
  };

  const parsed = employeeSchema.safeParse(raw);
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
    name: parsed.data.name,
    job_title: parsed.data.job_title,
    phone: parsed.data.phone ?? null,
    email: parsed.data.email || null,
    role: parsed.data.role,
    active: parsed.data.active,
  };

  if (parsed.data.id) {
    const { error } = await supabase
      .from("employees")
      .update({ ...payload, updated_by: session.user.id })
      .eq("id", parsed.data.id)
      .eq("petshop_id", membership.petshopId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("employees")
      .insert({ ...payload, created_by: session.user.id });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/app/funcionarios");
  return { ok: true };
}

export async function deleteEmployee(id: string): Promise<{ ok: boolean; error?: string }> {
  const { session, membership } = await requireTenant();
  if (!hasRole(membership, ["owner"])) {
    return { ok: false, error: "Apenas o dono pode excluir funcionários." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase indisponível." };

  const { error } = await supabase
    .from("employees")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: session.user.id,
    })
    .eq("id", id)
    .eq("petshop_id", membership.petshopId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/app/funcionarios");
  return { ok: true };
}

import { redirect } from "next/navigation";
import {
  UsuariosManager,
  type UserRow,
  type PetshopOption,
} from "@/components/admin-usuarios/usuarios-manager";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; petshop?: string }>;
}) {
  const session = await getSession();
  if (!session || session.user.globalRole !== "admin_master") {
    redirect("/login?error=not-authorized");
  }
  const params = await searchParams;
  const admin = createAdminClient();
  if (!admin) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Service role do Supabase não configurado.
      </div>
    );
  }

  const q = (params.q ?? "").trim();
  const petshopId = (params.petshop ?? "").trim();

  // Filter options and membership scope are independent, so fetch both in
  // parallel. This removes one full network round-trip from filtered views.
  const petshopsQuery = admin
    .from("petshops")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");
  const membersQuery = petshopId
    ? admin
        .from("memberships")
        .select("user_id")
        .eq("petshop_id", petshopId)
        .is("deleted_at", null)
    : Promise.resolve({ data: null });
  const [{ data: petshopsData }, { data: members }] = await Promise.all([
    petshopsQuery,
    membersQuery,
  ]);
  const petshops: PetshopOption[] = (petshopsData ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  // Build user list — filter by petshop first if provided (smaller set), then
  // search by name/email.
  let userIds: string[] | null = null;
  if (petshopId) {
    userIds = (members ?? []).map((m) => m.user_id);
    if (userIds.length === 0) {
      return (
        <UsuariosManager
          users={[]}
          petshops={petshops}
          currentSearch={q}
          currentPetshopId={petshopId}
        />
      );
    }
  }

  let usersQuery = admin
    .from("users")
    .select(
      "id, email, full_name, global_role, created_at, memberships:memberships!user_id(role, status, petshop:petshops(name))",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (userIds) {
    usersQuery = usersQuery.in("id", userIds);
  }
  if (q) {
    // Postgres `or` filter with ilike — escape % and _ from user input.
    const safe = q.replace(/[%_]/g, "\\$&");
    usersQuery = usersQuery.or(
      `full_name.ilike.%${safe}%,email.ilike.%${safe}%`,
    );
  }

  const { data: usersData } = await usersQuery;

  type RawUser = {
    id: string;
    email: string;
    full_name: string;
    global_role: string;
    created_at: string;
    memberships: {
      role: string;
      status: string;
      petshop: { name: string } | null;
    }[] | null;
  };

  const users: UserRow[] = ((usersData ?? []) as RawUser[]).map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    global_role: u.global_role,
    created_at: u.created_at,
    memberships: (u.memberships ?? [])
      .filter((m) => m.petshop !== null)
      .map((m) => ({
        role: m.role,
        status: m.status,
        petshopName: m.petshop!.name,
      })),
  }));

  return (
    <UsuariosManager
      users={users}
      petshops={petshops}
      currentSearch={q}
      currentPetshopId={petshopId}
    />
  );
}

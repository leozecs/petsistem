import { createClient } from "@/lib/supabase/server";

export type GlobalRole = "admin_master" | "user";
export type MemberRole = "owner" | "attendant" | "veterinarian";
export type PetshopStatus = "active" | "blocked" | "trial" | "cancelled";

export type Profile = {
  id: string;
  email: string;
  fullName: string;
  globalRole: GlobalRole;
  avatarUrl: string | null;
};

export type MembershipPetshop = {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  status: PetshopStatus;
  planName: string;
};

export type Membership = {
  petshopId: string;
  role: MemberRole;
  petshop: MembershipPetshop;
};

export type SessionContext = {
  user: Profile;
  memberships: Membership[];
  activeMembership: Membership | null;
};

type RawMembership = {
  petshop_id: string;
  role: MemberRole;
  petshop: {
    id: string;
    name: string;
    slug: string;
    subdomain: string;
    status: PetshopStatus;
    plan_name: string;
  } | null;
};

export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, global_role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: rawMemberships } = await supabase
    .from("memberships")
    .select(
      "petshop_id, role, petshop:petshops!inner(id, name, slug, subdomain, status, plan_name)",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .returns<RawMembership[]>();

  const memberships: Membership[] = (rawMemberships ?? [])
    .filter((m): m is RawMembership & { petshop: NonNullable<RawMembership["petshop"]> } => m.petshop !== null)
    .map((m) => ({
      petshopId: m.petshop_id,
      role: m.role,
      petshop: {
        id: m.petshop.id,
        name: m.petshop.name,
        slug: m.petshop.slug,
        subdomain: m.petshop.subdomain,
        status: m.petshop.status,
        planName: m.petshop.plan_name,
      },
    }));

  return {
    user: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      globalRole: profile.global_role,
      avatarUrl: profile.avatar_url,
    },
    memberships,
    activeMembership: memberships[0] ?? null,
  };
}

export function isAdminMaster(session: SessionContext | null): boolean {
  return session?.user.globalRole === "admin_master";
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PETGRES_OWNER_EMAIL = "marina@petgres.com.br";
const PETGRES_OWNER_NAME = "Marina Costa";
const PETGRES_OWNER_PASSWORD = process.env.PETGRES_OWNER_PASSWORD ?? "Petgres@2026!";

const PETSHOP_SLUG = "petgres";
const PETSHOP_NAME = "Petgres";
const PETSHOP_SUBDOMAIN = "petgres";
const PETSHOP_PHONE = "(19) 99999-0101";
const PETSHOP_WHATSAPP = "(19) 99999-0101";
const PETSHOP_EMAIL = "contato@petgres.com.br";
const PETSHOP_ADDRESS = "Rua das Palmeiras, 120 - Vinhedo/SP";
const PETSHOP_PIX_KEY = "financeiro@petgres.com.br";

export async function POST() {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Supabase admin client not configured." },
      { status: 428 },
    );
  }

  // 1. Marina auth user — create or update
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    return NextResponse.json({ ok: false, message: listError.message }, { status: 500 });
  }

  let ownerAuthUser = listData.users.find((u) => u.email === PETGRES_OWNER_EMAIL);
  if (!ownerAuthUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: PETGRES_OWNER_EMAIL,
      password: PETGRES_OWNER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: PETGRES_OWNER_NAME, global_role: "user" },
    });
    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, message: `Failed to create Marina: ${error?.message}` },
        { status: 500 },
      );
    }
    ownerAuthUser = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(ownerAuthUser.id, {
      password: PETGRES_OWNER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: PETGRES_OWNER_NAME, global_role: "user" },
    });
    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, message: `Failed to update Marina: ${error?.message}` },
        { status: 500 },
      );
    }
    ownerAuthUser = data.user;
  }
  const ownerId = ownerAuthUser.id;

  // 2. Marina profile
  const { error: profileError } = await supabase.from("users").upsert({
    id: ownerId,
    full_name: PETGRES_OWNER_NAME,
    email: PETGRES_OWNER_EMAIL,
    phone: PETSHOP_PHONE,
    global_role: "user",
  });
  if (profileError) {
    return NextResponse.json(
      { ok: false, message: `users upsert failed: ${profileError.message}` },
      { status: 500 },
    );
  }

  // 3. Plano Profissional
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, code, price_cents, name")
    .eq("code", "professional")
    .maybeSingle();
  if (planError || !plan) {
    return NextResponse.json(
      { ok: false, message: `Plano profissional não encontrado: ${planError?.message}` },
      { status: 500 },
    );
  }

  // 4. Petgres petshop
  const { data: existingPetshop } = await supabase
    .from("petshops")
    .select("id")
    .eq("slug", PETSHOP_SLUG)
    .maybeSingle();

  let petshopId: string;
  if (existingPetshop) {
    petshopId = existingPetshop.id;
    const { error: updateErr } = await supabase
      .from("petshops")
      .update({
        name: PETSHOP_NAME,
        subdomain: PETSHOP_SUBDOMAIN,
        status: "active",
        plan_id: plan.id,
        plan_name: plan.name,
        phone: PETSHOP_PHONE,
        whatsapp: PETSHOP_WHATSAPP,
        email: PETSHOP_EMAIL,
        address: PETSHOP_ADDRESS,
        pix_key: PETSHOP_PIX_KEY,
        primary_color: "#0F172A",
        updated_by: ownerId,
      })
      .eq("id", petshopId);
    if (updateErr) {
      return NextResponse.json(
        { ok: false, message: `petshop update failed: ${updateErr.message}` },
        { status: 500 },
      );
    }
  } else {
    const { data: created, error: createErr } = await supabase
      .from("petshops")
      .insert({
        name: PETSHOP_NAME,
        slug: PETSHOP_SLUG,
        subdomain: PETSHOP_SUBDOMAIN,
        status: "active",
        plan_id: plan.id,
        plan_name: plan.name,
        phone: PETSHOP_PHONE,
        whatsapp: PETSHOP_WHATSAPP,
        email: PETSHOP_EMAIL,
        address: PETSHOP_ADDRESS,
        pix_key: PETSHOP_PIX_KEY,
        primary_color: "#0F172A",
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (createErr || !created) {
      return NextResponse.json(
        { ok: false, message: `petshop insert failed: ${createErr?.message}` },
        { status: 500 },
      );
    }
    petshopId = created.id;
  }

  // 5. Marina membership = owner
  const { error: membershipError } = await supabase
    .from("memberships")
    .upsert(
      {
        petshop_id: petshopId,
        user_id: ownerId,
        role: "owner",
        status: "active",
        created_by: ownerId,
        updated_by: ownerId,
      },
      { onConflict: "petshop_id,user_id" },
    );
  if (membershipError) {
    return NextResponse.json(
      { ok: false, message: `membership upsert failed: ${membershipError.message}` },
      { status: 500 },
    );
  }

  // 6. Subscription (current month, pending)
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 25).toISOString().slice(0, 10);

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("petshop_id", petshopId)
    .maybeSingle();
  if (!existingSub) {
    await supabase.from("subscriptions").insert({
      petshop_id: petshopId,
      plan_name: plan.name,
      amount_cents: plan.price_cents,
      due_date: dueDate,
      status: "pending",
      pix_key: "financeiro@petsistem.com.br",
      created_by: ownerId,
      updated_by: ownerId,
    });
  }

  // 7. Default calendars (banho/tosa + veterinária)
  const calendars = [
    { area: "grooming" as const, name: "Banho e Tosa" },
    { area: "veterinary" as const, name: "Veterinária" },
  ];
  for (const cal of calendars) {
    const { data: existing } = await supabase
      .from("calendars")
      .select("id")
      .eq("petshop_id", petshopId)
      .eq("area", cal.area)
      .eq("name", cal.name)
      .maybeSingle();
    if (!existing) {
      await supabase.from("calendars").insert({
        petshop_id: petshopId,
        area: cal.area,
        name: cal.name,
        timezone: "America/Sao_Paulo",
        active: true,
        created_by: ownerId,
      });
    }
  }

  // 8. Default services
  const services = [
    { area: "grooming" as const, name: "Banho", duration: 45, price: 7000 },
    { area: "grooming" as const, name: "Tosa", duration: 60, price: 9000 },
    { area: "grooming" as const, name: "Banho + Tosa", duration: 90, price: 14000 },
    { area: "grooming" as const, name: "Hidratação", duration: 50, price: 9500 },
    { area: "veterinary" as const, name: "Consulta", duration: 40, price: 16000 },
    { area: "veterinary" as const, name: "Vacinação", duration: 30, price: 12000 },
  ];
  for (const svc of services) {
    const { data: existing } = await supabase
      .from("services")
      .select("id")
      .eq("petshop_id", petshopId)
      .eq("area", svc.area)
      .eq("name", svc.name)
      .maybeSingle();
    if (!existing) {
      await supabase.from("services").insert({
        petshop_id: petshopId,
        area: svc.area,
        name: svc.name,
        duration_minutes: svc.duration,
        price_cents: svc.price,
        active: true,
        created_by: ownerId,
      });
    }
  }

  // 9. Default checklist steps (Petgres specific)
  const steps = [
    "Recebido",
    "Banho",
    "Secagem",
    "Tosa",
    "Finalização",
    "Pronto para retirada",
  ];
  for (let i = 0; i < steps.length; i++) {
    const { data: existing } = await supabase
      .from("checklist_steps")
      .select("id")
      .eq("petshop_id", petshopId)
      .eq("position", i + 1)
      .maybeSingle();
    if (!existing) {
      await supabase.from("checklist_steps").insert({
        petshop_id: petshopId,
        label: steps[i]!,
        position: i + 1,
        active: true,
        created_by: ownerId,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    petshopId,
    ownerId,
    owner: { email: PETGRES_OWNER_EMAIL, name: PETGRES_OWNER_NAME },
    plan: plan.code,
  });
}

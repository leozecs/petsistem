import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const email = process.env.ADMIN_MASTER_EMAIL;
  const password = process.env.ADMIN_MASTER_PASSWORD;
  const supabase = createAdminClient();

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "ADMIN_MASTER_EMAIL ou ADMIN_MASTER_PASSWORD ausente." },
      { status: 400 },
    );
  }

  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Supabase ainda nao esta configurado nas envs." },
      { status: 428 },
    );
  }

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    return NextResponse.json({ ok: false, message: listError.message }, { status: 500 });
  }

  let user = listData.users.find((candidate) => candidate.email === email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Leonardo Rodrigues",
        global_role: "admin_master",
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, message: error?.message ?? "Nao foi possivel criar o Admin Master." },
        { status: 500 },
      );
    }

    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Leonardo Rodrigues",
        global_role: "admin_master",
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, message: error?.message ?? "Nao foi possivel atualizar o Admin Master." },
        { status: 500 },
      );
    }

    user = data.user;
  }

  const { error: profileError } = await supabase.from("users").upsert({
    id: user.id,
    full_name: "Leonardo Rodrigues",
    email,
    global_role: "admin_master",
  });

  if (profileError) {
    return NextResponse.json(
      {
        ok: false,
        message: `Usuario auth criado, mas perfil public.users falhou: ${profileError.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, userId: user.id, email });
}

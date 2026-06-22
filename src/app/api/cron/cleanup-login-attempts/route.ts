import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Cron diário. Apaga rows de login_attempts com mais de 7 dias.
// O rate-limit do signIn só considera tentativas nos últimos 15 min, então
// histórico além disso é apenas peso na tabela e degrada o range scan.
//
// Gate: Authorization: Bearer ${CRON_SECRET}. Vercel cron manda esse header.

const RETENTION_DAYS = 7;

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return new NextResponse(null, { status: 404 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return new NextResponse(null, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service role indisponível." }, { status: 500 });
  }

  const cutoffIso = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();

  const { error, count } = await admin
    .from("login_attempts")
    .delete({ count: "exact" })
    .lt("attempted_at", cutoffIso);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}

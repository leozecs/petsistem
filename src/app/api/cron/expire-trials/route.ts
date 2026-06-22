import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Bloqueia diariamente lojas cujo trial gratuito venceu.
 *
 * O trial é identificado pela assinatura pendente de valor zero criada no
 * cadastro público. A loja só é alterada se ainda estiver com status `trial`,
 * preservando qualquer ativação ou bloqueio manual feito pelo Admin Master.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return new NextResponse(null, { status: 404 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return new NextResponse(null, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Service role indisponível." },
      { status: 500 },
    );
  }

  const { data, error } = await admin.rpc("reconcile_billing_status");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...(data as Record<string, number>) });
}

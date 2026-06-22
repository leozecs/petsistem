import { NextResponse, type NextRequest } from "next/server";

/**
 * Gate de segurança pros endpoints /api/setup/*:
 *  - Em produção (VERCEL_ENV === "production") retorna 404 sempre. Endpoints
 *    de bootstrap não devem ser expostos em prod nem com token.
 *  - Fora de prod, exige header `x-setup-token` que casa com `SETUP_TOKEN` da
 *    env. Se a env não estiver definida, o endpoint também responde 404 (não
 *    é seguro permitir acesso sem token).
 *
 * Retorna `null` se autorizado; caso contrário, uma Response pra retornar
 * direto.
 */
export function checkSetupGate(req: NextRequest | Request): Response | null {
  // Em prod, endpoint não existe (defense in depth, mesmo com token).
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const expected = process.env.SETUP_TOKEN;
  if (!expected) {
    // Sem token configurado, endpoint não funciona em nenhum ambiente.
    return new NextResponse(null, { status: 404 });
  }

  const got = req.headers.get("x-setup-token");
  if (!got || got !== expected) {
    return new NextResponse(null, { status: 404 });
  }

  return null;
}

/**
 * Validação + normalização de WhatsApp brasileiro.
 *
 * Aceita formatos comuns que o tutor digita:
 *   (11) 99999-8888    11999998888    +55 11 99999-8888    55 11 99999 8888
 *
 * Normaliza pro formato e164-like sem `+` (`5511999998888`), que é o que
 * `wa.me/<num>` espera. Retorna null se não casar com celular (11 dígitos
 * locais começando em 9) nem com fixo (10 dígitos locais). DDDs entre 11 e 99.
 */
export function parseBrPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Tira o 55 inicial se já vier com country code (e o número for longo o suficiente).
  const local =
    digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  // Celular: 2 dígitos DDD + 9 + 8 dígitos = 11 chars
  if (local.length === 11) {
    if (!/^[1-9]\d9\d{8}$/.test(local)) return null;
    return "55" + local;
  }
  // Fixo: 2 dígitos DDD + 8 dígitos = 10 chars (ainda permitido pra lojas)
  if (local.length === 10) {
    if (!/^[1-9]\d\d{8}$/.test(local)) return null;
    return "55" + local;
  }
  return null;
}

/** Formato amigável `(11) 99999-8888` a partir do normalizado `5511999998888`. */
export function formatBrPhone(normalized: string | null): string {
  if (!normalized) return "";
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(normalized);
  if (!m) return normalized;
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}

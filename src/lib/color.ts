/**
 * WCAG 2.1 relative luminance + contrast ratio helpers. Usado pra garantir
 * que cores customizadas (ex: bg da sidebar) mantêm legibilidade do texto
 * branco. Threshold AA texto normal: 4.5:1.
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Retorna a razão de contraste entre `hex` e branco (#FFFFFF). Branco tem
 * luminância 1, então a razão simplifica pra 1.05 / (Lcolor + 0.05).
 * Cor inválida retorna 1 (sem contraste).
 */
export function contrastWithWhite(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const L = relativeLuminance(rgb);
  return 1.05 / (L + 0.05);
}

/** WCAG AA pra texto normal. */
export const MIN_AA_CONTRAST = 4.5;

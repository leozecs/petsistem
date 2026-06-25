/** Selects navigation text tone from one predictable brightness threshold. */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function isLightBackground(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const [red, green, blue] = rgb;
  return (red * 299 + green * 587 + blue * 114) / 1000 >= 160;
}

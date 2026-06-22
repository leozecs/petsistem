/**
 * Generates a tracking slug for an appointment that's:
 *  - human-readable ("mel-2026-06-21-a4b2") so the atendente can ditar pro tutor
 *  - non-enumerable thanks to the 4-char random suffix
 *  - URL-safe (lowercase ASCII + dashes only)
 *
 * The pet-name prefix is best-effort. Empty/null names fall back to "pet".
 * The date is the UTC calendar date of `startsAtIso` — close enough for tracking;
 * we don't need petshop-TZ accuracy here since the random suffix carries the
 * uniqueness load.
 */

function petSlugPart(name: string | null): string {
  const ascii = (name ?? "pet")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return ascii || "pet";
}

function randomToken(len = 4): string {
  // base36 [0-9a-z], cryptographically random. 36^4 ≈ 1.7M variants per (pet, date).
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => (b % 36).toString(36)).join("");
}

export function generateTrackingSlug(petName: string | null, startsAtIso: string): string {
  const date = startsAtIso.slice(0, 10); // YYYY-MM-DD
  return `${petSlugPart(petName)}-${date}-${randomToken()}`;
}

const SLUG_RE = /^[a-z0-9-]{6,80}$/;
export function isValidTrackingSlug(input: string): boolean {
  return SLUG_RE.test(input);
}

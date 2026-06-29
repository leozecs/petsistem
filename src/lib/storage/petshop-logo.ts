export const PETSHOP_LOGO_BUCKET = "petshop-logos";
export const MAX_PETSHOP_LOGO_BYTES = 2 * 1024 * 1024;

export const PETSHOP_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type PetshopLogoMimeType = (typeof PETSHOP_LOGO_MIME_TYPES)[number];
export type PetshopLogoExtension = "png" | "jpg" | "webp";

const MIME_EXTENSIONS: Record<PetshopLogoMimeType, PetshopLogoExtension> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function getPetshopLogoExtension(
  mimeType: string,
): PetshopLogoExtension | null {
  return PETSHOP_LOGO_MIME_TYPES.includes(mimeType as PetshopLogoMimeType)
    ? MIME_EXTENSIONS[mimeType as PetshopLogoMimeType]
    : null;
}

export function isTenantPetshopLogoPath(path: string, petshopId: string) {
  const [tenantFolder, fileName, extraSegment] = path.split("/");
  return (
    !extraSegment &&
    tenantFolder === petshopId &&
    /^logo-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/i.test(
      fileName ?? "",
    )
  );
}

export function detectPetshopLogoExtension(
  bytes: Uint8Array,
): PetshopLogoExtension | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

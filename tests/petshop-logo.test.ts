import { describe, expect, it } from "vitest";
import {
  detectPetshopLogoExtension,
  getPetshopLogoExtension,
  isTenantPetshopLogoPath,
} from "@/lib/storage/petshop-logo";

const PETSHOP_ID = "2e38d5dd-2a50-48c7-a56a-b3fd95b66e1b";
const OTHER_PETSHOP_ID = "4bd69f44-0699-4872-b21d-7d98e357667c";
const LOGO_ID = "6630eecd-6a2e-47f2-90fb-781e45276bc1";

describe("petshop logo upload contract", () => {
  it("only accepts safe raster MIME types", () => {
    expect(getPetshopLogoExtension("image/png")).toBe("png");
    expect(getPetshopLogoExtension("image/jpeg")).toBe("jpg");
    expect(getPetshopLogoExtension("image/webp")).toBe("webp");
    expect(getPetshopLogoExtension("image/svg+xml")).toBeNull();
    expect(getPetshopLogoExtension("text/html")).toBeNull();
  });

  it("binds generated paths to one tenant and one randomized logo file", () => {
    const path = `${PETSHOP_ID}/logo-${LOGO_ID}.png`;
    expect(isTenantPetshopLogoPath(path, PETSHOP_ID)).toBe(true);
    expect(isTenantPetshopLogoPath(path, OTHER_PETSHOP_ID)).toBe(false);
    expect(isTenantPetshopLogoPath(`${PETSHOP_ID}/nested/${LOGO_ID}.png`, PETSHOP_ID)).toBe(false);
    expect(isTenantPetshopLogoPath(`${PETSHOP_ID}/logo.png`, PETSHOP_ID)).toBe(false);
  });

  it("detects the real file signature instead of trusting the extension", () => {
    expect(detectPetshopLogoExtension(new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]))).toBe("png");
    expect(detectPetshopLogoExtension(new Uint8Array([0xff, 0xd8, 0xff]))).toBe("jpg");
    expect(detectPetshopLogoExtension(new TextEncoder().encode("RIFF0000WEBP"))).toBe("webp");
    expect(detectPetshopLogoExtension(new TextEncoder().encode("<script>"))).toBeNull();
  });
});

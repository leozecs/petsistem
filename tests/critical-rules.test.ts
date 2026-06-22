import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isPetshopAcceptingBookings, isPetshopOperational } from "@/lib/petshop-status";
import { isReservedSubdomain } from "@/lib/subdomains";
import { utcInstantOfPetshopDateTime } from "@/lib/calendar/time";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "@/lib/security/headers";
import { classifyHost } from "@/middleware";
import { hasRole } from "@/lib/auth/require-tenant";
import type { Membership } from "@/lib/auth/session";

describe("tenant status contract", () => {
  it("keeps active and trial shops bookable and operational", () => {
    for (const status of ["active", "trial"]) {
      expect(isPetshopAcceptingBookings(status)).toBe(true);
      expect(isPetshopOperational(status)).toBe(true);
    }
  });

  it("blocks cancelled and blocked shops", () => {
    for (const status of ["cancelled", "blocked"]) {
      expect(isPetshopAcceptingBookings(status)).toBe(false);
      expect(isPetshopOperational(status)).toBe(false);
    }
  });
});

describe("role contract", () => {
  it("only grants explicitly allowed tenant roles", () => {
    const membership = { role: "attendant" } as Membership;
    expect(hasRole(membership, ["owner", "attendant"])).toBe(true);
    expect(hasRole(membership, ["owner", "veterinarian"])).toBe(false);
  });
});

describe("tenant routing contract", () => {
  it("routes a valid tenant and rejects reserved or nested subdomains", () => {
    expect(classifyHost("petgres.petsistem.com.br")).toEqual({ kind: "tenant", slug: "petgres" });
    expect(classifyHost("admin-master.petsistem.com.br")).toEqual({ kind: "unknown" });
    expect(classifyHost("evil.petgres.petsistem.com.br")).toEqual({ kind: "unknown" });
    expect(isReservedSubdomain("LOGIN")).toBe(true);
  });
});

describe("booking timezone contract", () => {
  it("converts local booking time with each shop timezone", () => {
    expect(utcInstantOfPetshopDateTime(2026, 5, 22, 9, 0, "America/Sao_Paulo").toISOString()).toBe("2026-06-22T12:00:00.000Z");
    expect(utcInstantOfPetshopDateTime(2026, 5, 22, 9, 0, "America/Manaus").toISOString()).toBe("2026-06-22T13:00:00.000Z");
  });
});

describe("security baseline", () => {
  it("ships CSP and browser hardening headers", () => {
    const names = new Set(SECURITY_HEADERS.map((header) => header.key));
    expect([...names]).toEqual(expect.arrayContaining([
      "Content-Security-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]));
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
  });

  it("keeps clinical records owner/veterinarian only in latest RLS migration", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260622202427_security_public_rate_limits_and_clinical_notes.sql"),
      "utf8",
    );
    expect(sql).toContain('drop policy if exists "tenant members read clinical notes"');
    expect(sql).toContain("array['owner', 'veterinarian']");
  });

  it("keeps marketing free from fake contact and customer claims", () => {
    const page = readFileSync(join(process.cwd(), "src/app/marketing/page.tsx"), "utf8");
    for (const forbidden of [
      "5519999990000",
      "petgres.petsistem.com.br/agendar",
      "backup diário",
      "Bruna Curcia",
      "Clínica Vida Animal",
    ]) {
      expect(page).not.toContain(forbidden);
    }
  });
});

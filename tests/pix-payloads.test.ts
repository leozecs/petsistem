import { describe, expect, it } from "vitest";
import { pixPayloadForPlan } from "@/lib/billing/pix-payloads";

describe("pixPayloadForPlan", () => {
  it.each([
    ["Starter", "139.99"],
    ["Profissional", "197.99"],
    ["Premium", "239.99"],
  ])("returns matching payload for %s", (plan, amount) => {
    expect(pixPayloadForPlan(plan)).toContain(amount);
  });
});

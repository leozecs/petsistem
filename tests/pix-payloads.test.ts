import { describe, expect, it } from "vitest";
import { pixPayloadForPlan } from "@/lib/billing/pix-payloads";

describe("pixPayloadForPlan", () => {
  it.each([
    ["Starter", "49.99"],
    ["Profissional", "99.99"],
    ["Premium", "139.99"],
  ])("returns matching payload for %s", (plan, amount) => {
    expect(pixPayloadForPlan(plan)).toContain(amount);
  });
});

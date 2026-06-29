export type PlanCode = "starter" | "profissional" | "premium";

export type PlanRule = {
  code: PlanCode;
  name: string;
  maxUsers: number;
  allowsVeterinarian: boolean;
  gatedRoutes: string[];
};

export const PLAN_RULES: Record<PlanCode, PlanRule> = {
  starter: {
    code: "starter",
    name: "Starter",
    maxUsers: 2,
    allowsVeterinarian: false,
    gatedRoutes: ["/app/consultas", "/app/veterinarios"],
  },
  profissional: {
    code: "profissional",
    name: "Profissional",
    maxUsers: 5,
    allowsVeterinarian: true,
    gatedRoutes: [],
  },
  premium: {
    code: "premium",
    name: "Premium",
    maxUsers: 12,
    allowsVeterinarian: true,
    gatedRoutes: [],
  },
};

export function normalizePlanCode(value: string | null | undefined): PlanCode {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized.includes("starter")) return "starter";
  if (normalized.includes("premium")) return "premium";
  return "profissional";
}

export function getPlanRule(value: string | null | undefined): PlanRule {
  return PLAN_RULES[normalizePlanCode(value)];
}

export function isRouteAllowedByPlan(
  planName: string | null | undefined,
  pathname: string,
): boolean {
  const rule = getPlanRule(planName);
  return !rule.gatedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

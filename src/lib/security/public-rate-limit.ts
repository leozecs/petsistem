import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

type RateLimitInput = {
  action: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "limited" | "unavailable" };

function hashIdentifier(action: string, identifier: string): string | null {
  const salt =
    process.env.RATE_LIMIT_SECRET ??
    process.env.CRON_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!salt) return null;

  return createHash("sha256")
    .update(`${salt}\0${action}\0${identifier}`)
    .digest("hex");
}

export async function getPublicClientIdentifier(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || requestHeaders.get("x-real-ip");
  if (ip) return `ip:${ip}`;

  // Vercel normally supplies an IP. This bounded fallback avoids a global key
  // if a proxy strips it, without persisting raw browser data.
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 256) ?? "unknown";
  const language = requestHeaders.get("accept-language")?.slice(0, 64) ?? "unknown";
  return `fallback:${userAgent}:${language}`;
}

export async function consumePublicRateLimit(
  input: RateLimitInput,
): Promise<RateLimitResult> {
  const keyHash = hashIdentifier(input.action, input.identifier);
  const admin = createAdminClient();
  if (!keyHash || !admin) return { allowed: false, reason: "unavailable" };

  const { data, error } = await admin.rpc("consume_public_rate_limit", {
    p_action: input.action,
    p_key_hash: keyHash,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
  });

  if (error) {
    console.error("public rate limit unavailable", {
      action: input.action,
      code: error.code,
    });
    return { allowed: false, reason: "unavailable" };
  }

  return data ? { allowed: true } : { allowed: false, reason: "limited" };
}

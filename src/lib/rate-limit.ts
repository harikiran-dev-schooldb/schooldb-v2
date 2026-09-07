import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

type RateLimitRow = {
  requestCount: number;
  expiresAt: Date;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function rateLimitKey(scope: string, identifier: string) {
  return createHash("sha256")
    .update(`${scope}:${identifier}`)
    .digest("hex");
}

export function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || null;
}

export async function consumeRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const keyHash = rateLimitKey(scope, identifier);
  const expiresAt = new Date(Date.now() + windowMs);
  const rows = await prisma.$queryRaw<RateLimitRow[]>`
    INSERT INTO "RequestRateLimit" ("keyHash", "requestCount", "expiresAt", "updatedAt")
    VALUES (${keyHash}, 1, ${expiresAt}, NOW())
    ON CONFLICT ("keyHash") DO UPDATE SET
      "requestCount" = CASE
        WHEN "RequestRateLimit"."expiresAt" <= NOW() THEN 1
        ELSE "RequestRateLimit"."requestCount" + 1
      END,
      "expiresAt" = CASE
        WHEN "RequestRateLimit"."expiresAt" <= NOW() THEN EXCLUDED."expiresAt"
        ELSE "RequestRateLimit"."expiresAt"
      END,
      "updatedAt" = NOW()
    RETURNING "requestCount", "expiresAt"
  `;
  const row = rows[0];
  const requestCount = row?.requestCount ?? limit + 1;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(((row?.expiresAt.getTime() ?? expiresAt.getTime()) - Date.now()) / 1000),
  );

  return {
    allowed: requestCount <= limit,
    remaining: Math.max(0, limit - requestCount),
    retryAfterSeconds,
  };
}

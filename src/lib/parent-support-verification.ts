import { createHmac, timingSafeEqual } from "node:crypto";

import { phoneHash } from "@/features/auth/otp";
import { prisma } from "@/lib/prisma";

const TOKEN_VERSION = 1;
export const PARENT_SUPPORT_VERIFICATION_MS = 15 * 60 * 1000;

type ParentSupportVerificationPayload = {
  v: number;
  purpose: "parent-support";
  challengeId: string;
  schoolId: string;
  phone: string;
  exp: number;
};

function verificationSecret() {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("Authentication is not configured");
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", verificationSecret())
    .update(`parent-support:${payload}`)
    .digest("base64url");
}

export function createParentSupportVerificationToken(input: {
  challengeId: string;
  schoolId: string;
  phone: string;
  expiresAt: Date;
}) {
  const payload: ParentSupportVerificationPayload = {
    v: TOKEN_VERSION,
    purpose: "parent-support",
    challengeId: input.challengeId,
    schoolId: input.schoolId,
    phone: input.phone,
    exp: input.expiresAt.getTime(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function readParentSupportVerificationToken(token: string) {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;

  const expected = Buffer.from(signature(encoded));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return null;
  }

  try {
    const value = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<ParentSupportVerificationPayload>;
    if (
      value.v !== TOKEN_VERSION ||
      value.purpose !== "parent-support" ||
      typeof value.challengeId !== "string" ||
      typeof value.schoolId !== "string" ||
      typeof value.phone !== "string" ||
      typeof value.exp !== "number" ||
      value.exp <= Date.now()
    ) {
      return null;
    }
    return value as ParentSupportVerificationPayload;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || null;
}

export async function requireParentSupportVerification(
  request: Request,
  schoolId: string,
) {
  const token = bearerToken(request);
  const payload = token ? readParentSupportVerificationToken(token) : null;
  if (!payload || payload.schoolId !== schoolId) return null;

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      id: payload.challengeId,
      schoolId,
      phoneHash: phoneHash(schoolId, payload.phone),
      verifiedAt: { not: null },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return challenge ? payload : null;
}

export async function claimParentSupportVerification(
  request: Request,
  schoolId: string,
  expectedPhone: string,
) {
  const payload = await requireParentSupportVerification(request, schoolId);
  if (!payload || payload.phone !== expectedPhone) return null;

  const consumedAt = new Date();
  const claim = await prisma.otpChallenge.updateMany({
    where: {
      id: payload.challengeId,
      schoolId,
      consumedAt: null,
      expiresAt: { gt: consumedAt },
    },
    data: { consumedAt },
  });
  return claim.count === 1 ? { payload, consumedAt } : null;
}

export async function releaseParentSupportVerification(
  challengeId: string,
  consumedAt: Date,
) {
  await prisma.otpChallenge.updateMany({
    where: { id: challengeId, consumedAt },
    data: { consumedAt: null },
  });
}

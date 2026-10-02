import { z } from "zod";

import {
  normalizeIndianMobile,
  otpHash,
  OTP_MAX_ATTEMPTS,
  otpMatches,
  phoneHash,
} from "@/features/auth/otp";
import { prisma } from "@/lib/prisma";
import { runSerializableTransaction } from "@/lib/prisma-transaction";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";
import {
  createParentSupportVerificationToken,
  PARENT_SUPPORT_VERIFICATION_MS,
} from "@/lib/parent-support-verification";
import { requireSchoolSlug } from "@/lib/tenant-context";

export const runtime = "nodejs";

type Context = { params: Promise<{ schoolSlug: string }> };

const inputSchema = z.object({
  phone: z.string(),
  otp: z.string().regex(/^\d{6}$/),
});

function candidateIds(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string"))]
    : [];
}

export async function POST(request: Request, { params }: Context) {
  try {
    const schoolSlug = requireSchoolSlug((await params).schoolSlug);
    const parsed = inputSchema.safeParse(await request.json());
    const phone = parsed.success ? normalizeIndianMobile(parsed.data.phone) : null;
    if (!parsed.success || !phone) {
      return Response.json({ error: "Enter the registered mobile number and 6-digit code." }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: { id: true },
    });
    if (!school) return Response.json({ error: "School not found." }, { status: 404 });

    const ip = requestIp(request);
    const limit = await consumeRateLimit(
      `parent-support-otp-verify:${school.id}`,
      ip || phone,
      10,
      10 * 60 * 1000,
    );
    if (!limit.allowed) {
      return Response.json(
        { error: "Too many verification attempts. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const hashedPhone = phoneHash(school.id, phone);
    const verification = await runSerializableTransaction(async (tx) => {
      const challenge = await tx.otpChallenge.findUnique({
        where: { schoolId_phoneHash: { schoolId: school.id, phoneHash: hashedPhone } },
        select: {
          id: true,
          codeHash: true,
          expiresAt: true,
          attempts: true,
          verifiedAt: true,
          consumedAt: true,
          candidateUserIds: true,
        },
      });
      if (
        !challenge || challenge.expiresAt <= new Date() || challenge.verifiedAt ||
        challenge.consumedAt || challenge.attempts >= OTP_MAX_ATTEMPTS
      ) {
        return { ok: false as const, exhausted: true };
      }

      if (!otpMatches(challenge.codeHash, otpHash(school.id, phone, parsed.data.otp))) {
        const attempts = challenge.attempts + 1;
        if (attempts >= OTP_MAX_ATTEMPTS) {
          await tx.otpChallenge.delete({ where: { id: challenge.id } });
        } else {
          await tx.otpChallenge.update({
            where: { id: challenge.id },
            data: { attempts: { increment: 1 } },
          });
        }
        return { ok: false as const, exhausted: attempts >= OTP_MAX_ATTEMPTS };
      }

      const parent = await tx.user.findFirst({
        where: {
          id: { in: candidateIds(challenge.candidateUserIds) },
          memberships: { some: { schoolId: school.id, role: "PARENT", isActive: true } },
          parentStudentLinks: { some: { schoolId: school.id, active: true } },
        },
        select: { id: true },
      });
      if (!parent) return { ok: false as const, parentRequired: true };

      const expiresAt = new Date(Date.now() + PARENT_SUPPORT_VERIFICATION_MS);
      await tx.otpChallenge.update({
        where: { id: challenge.id },
        data: { verifiedAt: new Date(), expiresAt },
      });
      return { ok: true as const, challengeId: challenge.id, expiresAt };
    });

    if (!verification.ok) {
      return Response.json(
        {
          error: "parentRequired" in verification
            ? "This number is not registered to an active parent account."
            : verification.exhausted
              ? "The code expired or too many attempts were made. Request a new code."
              : "Invalid code.",
        },
        { status: 401 },
      );
    }

    return Response.json({
      success: true,
      token: createParentSupportVerificationToken({
        challengeId: verification.challengeId,
        schoolId: school.id,
        phone,
        expiresAt: verification.expiresAt,
      }),
    });
  } catch (error) {
    console.error("PARENT SUPPORT OTP VERIFY ERROR", error);
    return Response.json({ error: "Unable to verify the code right now." }, { status: 500 });
  }
}

import { clerkClient } from "@clerk/nextjs/server";
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

export const runtime = "nodejs";

const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("VERIFY"),
    phone: z.string(),
    otp: z.string().regex(/^\d{6}$/),
    schoolSlug: z.string().min(1),
  }),
  z.object({
    action: z.literal("SELECT"),
    challengeId: z.string().min(1),
    accountId: z.string().min(1),
    schoolSlug: z.string().min(1),
  }),
]);
const RATE_WINDOW_MS = Math.max(
  60_000,
  Number(process.env.OTP_RATE_LIMIT_WINDOW_MS) || 600_000,
);
const PHONE_LIMIT = Math.max(
  1,
  Number(process.env.OTP_VERIFY_PHONE_LIMIT) || 10,
);
const IP_LIMIT = Math.max(1, Number(process.env.OTP_VERIFY_IP_LIMIT) || 50);

function readCandidateIds(value: unknown) {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter((item): item is string => typeof item === "string"),
        ),
      ]
    : [];
}

async function activeAccounts(schoolId: string, userIds: string[]) {
  return prisma.user.findMany({
    where: {
      id: { in: userIds },
      memberships: { some: { schoolId, isActive: true } },
    },
    select: {
      id: true,
      clerkUserId: true,
      firstName: true,
      lastName: true,
      memberships: {
        where: { schoolId, isActive: true },
        select: { role: true },
        take: 1,
      },
    },
  });
}

type ActiveAccount = Awaited<ReturnType<typeof activeAccounts>>[number];

async function createSessionToken(account: ActiveAccount, schoolSlug: string) {
  const membership = account.memberships[0];
  if (!membership) return null;
  const client = await clerkClient();
  let clerkUser;
  try {
    clerkUser = await client.users.getUser(account.clerkUserId);
  } catch (error) {
    // A database row can outlive its Clerk identity (for example, after a
    // user is deleted or when production is pointed at a different Clerk
    // instance). Treat that account as unavailable instead of returning a
    // misleading generic verification failure.
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 404
    ) {
      return null;
    }
    throw error;
  }
  await client.users.updateUserMetadata(account.clerkUserId, {
    publicMetadata: {
      ...clerkUser.publicMetadata,
      schoolSlug,
      role: membership.role,
    },
  });
  return (
    await client.signInTokens.createSignInToken({
      userId: account.clerkUserId,
      expiresInSeconds: 60,
    })
  ).token;
}

async function consumeChallenge(
  challengeId: string,
  schoolId: string,
  createToken: () => Promise<string | null>,
  resetVerificationOnFailure = false,
) {
  const claimedAt = new Date();
  const claim = await prisma.otpChallenge.updateMany({
    where: {
      id: challengeId,
      schoolId,
      verifiedAt: { not: null },
      consumedAt: null,
      expiresAt: { gt: claimedAt },
    },
    data: { consumedAt: claimedAt },
  });
  if (claim.count !== 1) return null;

  try {
    const token = await createToken();
    if (!token) {
      await prisma.otpChallenge.updateMany({
        where: { id: challengeId, consumedAt: claimedAt },
        data: { consumedAt: null },
      });
      return null;
    }
    await prisma.otpChallenge.deleteMany({
      where: { id: challengeId, consumedAt: claimedAt },
    });
    return token;
  } catch (error) {
    await prisma.otpChallenge.updateMany({
      where: { id: challengeId, consumedAt: claimedAt },
      data: {
        consumedAt: null,
        ...(resetVerificationOnFailure ? { verifiedAt: null } : {}),
      },
    });
    throw error;
  }
}

function rateLimited(retryAfterSeconds: number) {
  return Response.json(
    { error: "Too many verification attempts. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function POST(request: Request) {
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "The verification request is incomplete." },
        { status: 400 },
      );

    const school = await prisma.school.findUnique({
      where: { slug: parsed.data.schoolSlug },
      select: { id: true },
    });
    if (!school)
      return Response.json({ error: "School not found." }, { status: 404 });

    const ip = requestIp(request);
    if (ip) {
      const limit = await consumeRateLimit(
        `otp-verify-ip:${school.id}`,
        ip,
        IP_LIMIT,
        RATE_WINDOW_MS,
      );
      if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
    }

    if (parsed.data.action === "SELECT") {
      const challenge = await prisma.otpChallenge.findFirst({
        where: {
          id: parsed.data.challengeId,
          schoolId: school.id,
          verifiedAt: { not: null },
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, candidateUserIds: true },
      });
      const candidateIds = readCandidateIds(challenge?.candidateUserIds);
      if (!challenge || !candidateIds.includes(parsed.data.accountId)) {
        return Response.json(
          { error: "Account selection expired. Request a new code." },
          { status: 401 },
        );
      }
      const account = (
        await activeAccounts(school.id, [parsed.data.accountId])
      )[0];
      if (!account) {
        await prisma.otpChallenge.deleteMany({ where: { id: challenge.id } });
        return Response.json(
          { error: "This account is no longer active." },
          { status: 403 },
        );
      }
      const token = await consumeChallenge(challenge.id, school.id, () =>
        createSessionToken(account, parsed.data.schoolSlug),
      );
      return token
        ? Response.json({ success: true, token })
        : Response.json(
            {
              error:
                "This account is no longer available. Contact the school administrator.",
            },
            { status: 403 },
          );
    }

    const phone = normalizeIndianMobile(parsed.data.phone);
    if (!phone)
      return Response.json(
        { error: "Enter a valid mobile number." },
        { status: 400 },
      );
    const otp = parsed.data.otp;
    const phoneLimit = await consumeRateLimit(
      `otp-verify-phone:${school.id}`,
      phone,
      PHONE_LIMIT,
      RATE_WINDOW_MS,
    );
    if (!phoneLimit.allowed) return rateLimited(phoneLimit.retryAfterSeconds);

    const hashedPhone = phoneHash(school.id, phone);
    const verification = await runSerializableTransaction(async (tx) => {
      const challenge = await tx.otpChallenge.findUnique({
        where: {
          schoolId_phoneHash: { schoolId: school.id, phoneHash: hashedPhone },
        },
        select: {
          id: true,
          codeHash: true,
          expiresAt: true,
          verifiedAt: true,
          consumedAt: true,
          attempts: true,
          candidateUserIds: true,
        },
      });
      if (
        !challenge ||
        challenge.expiresAt <= new Date() ||
        challenge.verifiedAt ||
        challenge.consumedAt ||
        challenge.attempts >= OTP_MAX_ATTEMPTS
      ) {
        if (challenge)
          await tx.otpChallenge.deleteMany({
            where: { id: challenge.id, verifiedAt: null },
          });
        return { ok: false as const, exhausted: true };
      }
      if (
        !otpMatches(
          challenge.codeHash,
          otpHash(school.id, phone, otp),
        )
      ) {
        const attempts = challenge.attempts + 1;
        if (attempts >= OTP_MAX_ATTEMPTS)
          await tx.otpChallenge.delete({ where: { id: challenge.id } });
        else
          await tx.otpChallenge.update({
            where: { id: challenge.id },
            data: { attempts: { increment: 1 } },
          });
        return { ok: false as const, exhausted: attempts >= OTP_MAX_ATTEMPTS };
      }
      await tx.otpChallenge.update({
        where: { id: challenge.id },
        data: { verifiedAt: new Date() },
      });
      return { ok: true as const, challenge };
    });

    if (!verification.ok) {
      return Response.json(
        {
          error: verification.exhausted
            ? "Too many attempts. Request a new code."
            : "Invalid or expired code.",
        },
        { status: 401 },
      );
    }

    const { challenge } = verification;
    const accounts = (
      await activeAccounts(
        school.id,
        readCandidateIds(challenge.candidateUserIds),
      )
    ).filter((account) => Boolean(account.memberships[0]));
    if (accounts.length === 0) {
      await prisma.otpChallenge.delete({ where: { id: challenge.id } });
      return Response.json(
        { error: "This account is no longer active." },
        { status: 403 },
      );
    }
    if (accounts.length === 1) {
      const token = await consumeChallenge(
        challenge.id,
        school.id,
        () => createSessionToken(accounts[0], parsed.data.schoolSlug),
        true,
      );
      return token
        ? Response.json({ success: true, token })
        : Response.json(
            { error: "This account is no longer active." },
            { status: 403 },
          );
    }

    return Response.json({
      success: true,
      requiresAccountSelection: true,
      challengeId: challenge.id,
      accounts: accounts.map((account) => ({
        id: account.id,
        role: account.memberships[0].role,
        name:
          [account.firstName, account.lastName].filter(Boolean).join(" ") ||
          "SchoolDB user",
      })),
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR", error);
    return Response.json(
      { error: "Unable to verify the code right now." },
      { status: 500 },
    );
  }
}

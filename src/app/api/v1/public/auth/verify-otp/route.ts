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

export const runtime = "nodejs";

const verifySchema = z.object({
  action: z.literal("VERIFY"),
  phone: z.string(),
  otp: z.string().regex(/^\d{6}$/),
  schoolSlug: z.string().min(1),
});

const selectSchema = z.object({
  action: z.literal("SELECT"),
  challengeId: z.string().min(1),
  accountId: z.string().min(1),
  schoolSlug: z.string().min(1),
});

const inputSchema = z.discriminatedUnion("action", [verifySchema, selectSchema]);

function readCandidateIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string"))];
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

async function activeAccount(schoolId: string, userId: string) {
  const accounts = await activeAccounts(schoolId, [userId]);
  return accounts[0] ?? null;
}

async function createSessionToken(
  account: NonNullable<Awaited<ReturnType<typeof activeAccount>>>,
  schoolSlug: string,
) {
  const membership = account.memberships[0];
  if (!membership) return null;

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(account.clerkUserId);
  await client.users.updateUserMetadata(account.clerkUserId, {
    publicMetadata: {
      ...clerkUser.publicMetadata,
      schoolSlug,
      role: membership.role,
    },
  });
  const { token } = await client.signInTokens.createSignInToken({
    userId: account.clerkUserId,
    expiresInSeconds: 60,
  });
  return token;
}

export async function POST(request: Request) {
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "The verification request is incomplete." }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { slug: parsed.data.schoolSlug },
      select: { id: true },
    });
    if (!school) return Response.json({ error: "School not found." }, { status: 404 });

    if (parsed.data.action === "SELECT") {
      const challenge = await prisma.otpChallenge.findFirst({
        where: {
          id: parsed.data.challengeId,
          schoolId: school.id,
          verifiedAt: { not: null },
          expiresAt: { gt: new Date() },
        },
        select: { id: true, candidateUserIds: true },
      });
      const candidateIds = readCandidateIds(challenge?.candidateUserIds);
      if (!challenge || !candidateIds.includes(parsed.data.accountId)) {
        return Response.json({ error: "Account selection expired. Request a new code." }, { status: 401 });
      }

      const account = await activeAccount(school.id, parsed.data.accountId);
      if (!account) {
        await prisma.otpChallenge.deleteMany({ where: { id: challenge.id } });
        return Response.json({ error: "This account is no longer active." }, { status: 403 });
      }

      const token = await createSessionToken(account, parsed.data.schoolSlug);
      await prisma.otpChallenge.delete({ where: { id: challenge.id } });
      if (!token) return Response.json({ error: "This account is no longer active." }, { status: 403 });
      return Response.json({ success: true, token });
    }

    const phone = normalizeIndianMobile(parsed.data.phone);
    if (!phone) return Response.json({ error: "Enter a valid mobile number." }, { status: 400 });

    const hashedPhone = phoneHash(school.id, phone);
    const challenge = await prisma.otpChallenge.findUnique({
      where: { schoolId_phoneHash: { schoolId: school.id, phoneHash: hashedPhone } },
      select: {
        id: true,
        codeHash: true,
        expiresAt: true,
        attempts: true,
        candidateUserIds: true,
      },
    });

    if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= OTP_MAX_ATTEMPTS) {
      if (challenge) await prisma.otpChallenge.delete({ where: { id: challenge.id } });
      return Response.json({ error: "Invalid or expired code. Request a new one." }, { status: 401 });
    }

    const valid = otpMatches(challenge.codeHash, otpHash(school.id, phone, parsed.data.otp));
    if (!valid) {
      const attempts = challenge.attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) await prisma.otpChallenge.delete({ where: { id: challenge.id } });
      else await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts } });
      return Response.json({ error: attempts >= OTP_MAX_ATTEMPTS ? "Too many attempts. Request a new code." : "Invalid or expired code." }, { status: 401 });
    }

    const candidateIds = readCandidateIds(challenge.candidateUserIds);
    const accounts = (await activeAccounts(school.id, candidateIds))
      .filter((account) => Boolean(account.memberships[0]));

    if (accounts.length === 0) {
      await prisma.otpChallenge.delete({ where: { id: challenge.id } });
      return Response.json({ error: "This account is no longer active." }, { status: 403 });
    }

    if (accounts.length === 1) {
      const token = await createSessionToken(accounts[0], parsed.data.schoolSlug);
      await prisma.otpChallenge.delete({ where: { id: challenge.id } });
      if (!token) return Response.json({ error: "This account is no longer active." }, { status: 403 });
      return Response.json({ success: true, token });
    }

    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { verifiedAt: new Date() },
    });

    return Response.json({
      success: true,
      requiresAccountSelection: true,
      challengeId: challenge.id,
      accounts: accounts.map((account) => ({
        id: account.id,
        role: account.memberships[0].role,
        name: [account.firstName, account.lastName].filter(Boolean).join(" ") || "SchoolDB user",
      })),
    });
  } catch (error) {
    console.error("VERIFY OTP ERROR", error);
    return Response.json({ error: "Unable to verify the code right now." }, { status: 500 });
  }
}

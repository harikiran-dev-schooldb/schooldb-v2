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

const inputSchema = z.object({ phone: z.string(), otp: z.string().regex(/^\d{6}$/), schoolSlug: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Enter the complete 6-digit code." }, { status: 400 });
    const phone = normalizeIndianMobile(parsed.data.phone);
    if (!phone) return Response.json({ error: "Enter a valid mobile number." }, { status: 400 });

    const school = await prisma.school.findUnique({ where: { slug: parsed.data.schoolSlug }, select: { id: true } });
    if (!school) return Response.json({ error: "School not found." }, { status: 404 });

    const hashedPhone = phoneHash(school.id, phone);
    const challenge = await prisma.otpChallenge.findUnique({
      where: { schoolId_phoneHash: { schoolId: school.id, phoneHash: hashedPhone } },
      include: {
        user: {
          select: {
            clerkUserId: true,
            memberships: { where: { schoolId: school.id, isActive: true }, select: { role: true }, take: 1 },
          },
        },
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

    const membership = challenge.user.memberships[0];
    if (!membership) {
      await prisma.otpChallenge.delete({ where: { id: challenge.id } });
      return Response.json({ error: "This account is no longer active." }, { status: 403 });
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(challenge.user.clerkUserId);
    await client.users.updateUserMetadata(challenge.user.clerkUserId, {
      publicMetadata: {
        ...clerkUser.publicMetadata,
        schoolSlug: parsed.data.schoolSlug,
        role: membership.role,
      },
    });
    const { token } = await client.signInTokens.createSignInToken({ userId: challenge.user.clerkUserId, expiresInSeconds: 60 });
    await prisma.otpChallenge.delete({ where: { id: challenge.id } });

    return Response.json({ success: true, token });
  } catch (error) {
    console.error("VERIFY OTP ERROR", error);
    return Response.json({ error: "Unable to verify the code right now." }, { status: 500 });
  }
}

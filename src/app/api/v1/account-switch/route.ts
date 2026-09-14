import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import { normalizeIndianMobile, resolveOtpAccounts } from "@/features/auth/otp";
import { apiHandler } from "@/lib/api";
import { requireMembership } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { ApiResponse } from "@/lib/response";

const switchSchema = z.object({ accountId: z.string().min(1) });

async function availableAccounts() {
  const membership = await requireMembership();
  const phone = normalizeIndianMobile(membership.user.phone ?? "");
  if (!phone) {
    throw new ApiError(
      403,
      "Add a verified mobile number before switching accounts.",
    );
  }

  const accounts = await resolveOtpAccounts(membership.schoolId, phone);
  if (!accounts.some((account) => account.id === membership.userId)) {
    throw new ApiError(403, "This account is no longer available.");
  }

  return { membership, accounts };
}

export async function GET() {
  return apiHandler(async () => {
    const { membership, accounts } = await availableAccounts();
    return ApiResponse.success({
      accounts: accounts.map((account) => ({
        id: account.id,
        clerkUserId: account.clerkUserId,
        role: account.role,
        name: account.name,
        detail: account.detail,
        current: account.id === membership.userId,
      })),
    });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const parsed = switchSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Choose an account to continue.");

    const { membership, accounts } = await availableAccounts();
    const account = accounts.find((item) => item.id === parsed.data.accountId);
    if (!account) {
      throw new ApiError(403, "You cannot switch to this account.");
    }

    if (account.id === membership.userId) {
      return ApiResponse.success({ current: true, token: null });
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(account.clerkUserId);
    await client.users.updateUserMetadata(account.clerkUserId, {
      publicMetadata: {
        ...clerkUser.publicMetadata,
        schoolSlug: membership.school.slug,
        role: account.role,
      },
    });
    const signInToken = await client.signInTokens.createSignInToken({
      userId: account.clerkUserId,
      expiresInSeconds: 300,
    });

    return ApiResponse.success({ current: false, token: signInToken.token });
  });
}

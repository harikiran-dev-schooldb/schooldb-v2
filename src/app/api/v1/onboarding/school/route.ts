import { timingSafeEqual } from "node:crypto";
import { auth } from "@clerk/nextjs/server";

import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { ApiResponse } from "@/lib/response";
import { schoolOnboardingService } from "@/features/schools/services/school-onboarding.service";

export async function GET() {
  return apiHandler(async () => {
    const status = await schoolOnboardingService.getBootstrapStatus();

    return ApiResponse.success(status);
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const body = await request.json();
    const { userId } = await auth();
    if (!userId) throw new ApiError(401, "Sign in before completing initial setup.");

    const configuredSecret = process.env.SCHOOLDB_BOOTSTRAP_SECRET?.trim() || "";
    const providedSecret =
      typeof body.bootstrapSecret === "string" ? body.bootstrapSecret.trim() : "";
    if (!configuredSecret) {
      throw new ApiError(
        503,
        "Initial setup is disabled until SCHOOLDB_BOOTSTRAP_SECRET is configured.",
      );
    }
    const expected = Buffer.from(configuredSecret);
    const provided = Buffer.from(providedSecret);
    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    ) {
      throw new ApiError(403, "The initial setup secret is invalid.");
    }

    const clerkUserId =
      typeof body.clerkUserId === "string" ? body.clerkUserId.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";

    if (!clerkUserId) {
      throw new ApiError(400, "Clerk User ID is required.");
    }

    if (clerkUserId !== userId) {
      throw new ApiError(
        403,
        "The Clerk User ID must match the signed-in account.",
      );
    }

    if (!email) {
      throw new Error("Email is required.");
    }

    if (!firstName) {
      throw new Error("First name is required.");
    }

    if (!name) {
      throw new Error("School name is required.");
    }

    if (!slug) {
      throw new Error("School URL is required.");
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error(
        "School URL may contain only lowercase letters, numbers and hyphens.",
      );
    }

    const result = await schoolOnboardingService.createSchool(
      {
        clerkUserId,
        email,
        firstName,
        lastName: lastName || null,
      },
      { name, slug },
    );

    return ApiResponse.success(
      result,
      "SchoolDB initial setup completed successfully.",
      201,
    );
  });
}

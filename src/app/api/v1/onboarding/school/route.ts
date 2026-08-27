import { currentUser } from "@clerk/nextjs/server";

import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { schoolOnboardingService } from "@/features/schools/services/school-onboarding.service";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      throw new Error("Unauthorized.");
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const slug =
      typeof body.slug === "string"
        ? body.slug.trim()
        : "";

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

    const email =
      clerkUser.primaryEmailAddress?.emailAddress;

    if (!email) {
      throw new Error(
        "Your Clerk account does not have a primary email address.",
      );
    }

    const result =
      await schoolOnboardingService.createSchool(
        clerkUser.id,
        email,
        clerkUser.firstName ?? null,
        clerkUser.lastName ?? null,
        clerkUser.imageUrl ?? null,
        {
          name,
          slug,
        },
      );

    return ApiResponse.success(
      result,
      "School created successfully.",
      201,
    );
  });
}
import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import {
  deleteIdCardBackImage,
  readIdCardBackImage,
  saveIdCardBackImage,
  schoolLogoContentType,
  validateProfileImageFile,
} from "@/lib/private-storage";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { idCardBackImageUrl } from "@/lib/school-branding";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug") ?? "";
    const membership = await requireTenant(schoolSlug);
    const setting = await prisma.schoolIdCardSetting.findUnique({
      where: { schoolId: membership.schoolId },
      select: { backImageUrl: true },
    });
    if (!setting?.backImageUrl) {
      throw new ApiError(404, "ID card back image not found.");
    }

    const contents = await readIdCardBackImage(setting.backImageUrl);
    return new Response(new Uint8Array(contents), {
      headers: {
        "Content-Type": schoolLogoContentType(setting.backImageUrl),
        "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "Choose an ID card back image to upload.");
    }

    try {
      await validateProfileImageFile(file);
    } catch (error) {
      throw new ApiError(
        400,
        error instanceof Error ? error.message : "Invalid ID card back image.",
      );
    }

    const existing = await prisma.schoolIdCardSetting.findUnique({
      where: { schoolId: membership.schoolId },
      select: { backImageUrl: true },
    });
    const storedImage = await saveIdCardBackImage(file);
    let setting: { updatedAt: Date };
    try {
      setting = await prisma.schoolIdCardSetting.upsert({
        where: { schoolId: membership.schoolId },
        create: { schoolId: membership.schoolId, backImageUrl: storedImage },
        update: { backImageUrl: storedImage },
        select: { updatedAt: true },
      });
    } catch (error) {
      await deleteIdCardBackImage(storedImage).catch(() => undefined);
      throw error;
    }

    await deleteIdCardBackImage(existing?.backImageUrl ?? null).catch(
      () => undefined,
    );
    return ApiResponse.success(
      {
        imageUrl: idCardBackImageUrl(
          membership.school.slug,
          storedImage,
          setting.updatedAt,
        ),
      },
      "ID card back image updated.",
    );
  });
}

export async function DELETE() {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const existing = await prisma.schoolIdCardSetting.findUnique({
      where: { schoolId: membership.schoolId },
      select: { backImageUrl: true },
    });
    if (!existing?.backImageUrl) {
      return ApiResponse.success({ imageUrl: null }, "No back image to remove.");
    }

    await prisma.schoolIdCardSetting.update({
      where: { schoolId: membership.schoolId },
      data: { backImageUrl: null },
    });
    await deleteIdCardBackImage(existing.backImageUrl).catch(() => undefined);
    return ApiResponse.success({ imageUrl: null }, "ID card back image removed.");
  });
}

import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import {
  deletePublishedProfileImage,
  savePublicProfileImage,
  validateProfileImageFile,
} from "@/lib/private-storage";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  return apiHandler(async () => {
    await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new ApiError(400, "Choose a school logo to upload.");
    }

    try {
      await validateProfileImageFile(file);
    } catch (error) {
      throw new ApiError(
        400,
        error instanceof Error ? error.message : "Invalid school logo.",
      );
    }

    const school = await prisma.school.findUnique({
      where: { id },
      select: { id: true, logo: true },
    });
    if (!school) throw new ApiError(404, "School not found.");

    const logo = await savePublicProfileImage(file, `school-logos/${school.id}`);
    try {
      await prisma.school.update({ where: { id: school.id }, data: { logo } });
    } catch (error) {
      await deletePublishedProfileImage(logo).catch(() => undefined);
      throw error;
    }

    await deletePublishedProfileImage(school.logo).catch(() => undefined);
    return ApiResponse.success({ logo }, "School logo updated.");
  });
}

export async function DELETE(_request: Request, { params }: Props) {
  return apiHandler(async () => {
    await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const school = await prisma.school.findUnique({
      where: { id },
      select: { id: true, logo: true },
    });
    if (!school) throw new ApiError(404, "School not found.");

    await prisma.school.update({
      where: { id: school.id },
      data: { logo: null },
    });
    await deletePublishedProfileImage(school.logo).catch(() => undefined);

    return ApiResponse.success({ logo: null }, "School logo removed.");
  });
}

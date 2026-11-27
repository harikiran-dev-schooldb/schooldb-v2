import { writeAuditLog } from "@/lib/audit";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import {
  deleteSchoolLogo,
  saveSchoolLogo,
  validateProfileImageFile,
} from "@/lib/private-storage";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { publicSchoolLogoUrl } from "@/lib/school-branding";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN"]);
    if (actor.role !== "SUPER_ADMIN") throw new ApiError(403, "Super administrator required.");
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
      select: { id: true, slug: true, logo: true },
    });
    if (!school) throw new ApiError(404, "School not found.");

    const logo = await saveSchoolLogo(file);
    try {
      await prisma.$transaction(async (tx) => {
        await tx.school.update({ where: { id: school.id }, data: { logo } });
        await writeAuditLog(tx, { actor: { ...actor, schoolId: school.id }, module: "SYSTEM", action: "UPDATE", entityType: "SchoolConfiguration", entityId: school.id, summary: "Updated school logo" });
      });
    } catch (error) {
      await deleteSchoolLogo(logo).catch(() => undefined);
      throw error;
    }

    await deleteSchoolLogo(school.logo).catch(() => undefined);
    return ApiResponse.success(
      { logo: publicSchoolLogoUrl(school.slug, logo, Date.now()) },
      "School logo updated.",
    );
  });
}

export async function DELETE(_request: Request, { params }: Props) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN"]);
    if (actor.role !== "SUPER_ADMIN") throw new ApiError(403, "Super administrator required.");
    const { id } = await params;
    const school = await prisma.school.findUnique({
      where: { id },
      select: { id: true, logo: true },
    });
    if (!school) throw new ApiError(404, "School not found.");

    await prisma.$transaction(async (tx) => {
      await tx.school.update({ where: { id: school.id }, data: { logo: null } });
      await writeAuditLog(tx, { actor: { ...actor, schoolId: school.id }, module: "SYSTEM", action: "UPDATE", entityType: "SchoolConfiguration", entityId: school.id, summary: "Removed school logo" });
    });
    await deleteSchoolLogo(school.logo).catch(() => undefined);

    return ApiResponse.success({ logo: null }, "School logo removed.");
  });
}

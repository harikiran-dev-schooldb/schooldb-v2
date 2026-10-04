import { apiHandler } from "@/lib/api";
import {
  requireRole,
  requireTeacherFeatureAccess,
  teacherClassScope,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "ACCOUNTANT",
      "TEACHER",
    ]);
    const academicYearId =
      new URL(request.url).searchParams.get("academicYearId") || undefined;
    const allowedClassSections =
      tenant.role === "TEACHER"
        ? await requireTeacherFeatureAccess("FEES").then(() =>
            teacherClassScope(tenant.schoolId),
          )
        : undefined;

    const rows = await prisma.studentFeeInstallment.findMany({
      where: {
        status: { in: ["PENDING", "PARTIAL"] },
        studentFeeItem: {
          studentFee: {
            schoolId: tenant.schoolId,
            active: true,
            ...(academicYearId
              ? { feePlan: { academicYearId } }
              : {}),
            studentEnrollment: {
              ...(allowedClassSections
                ? allowedClassSections.length > 0
                  ? {
                      OR: allowedClassSections.map((scope) => ({
                        academicYearId: scope.academicYearId,
                        classId: scope.classId,
                        sectionId: scope.sectionId,
                      })),
                    }
                  : { id: { in: [] } }
                : {}),
            },
          },
        },
      },
      select: { name: true, sequence: true },
      distinct: ["name"],
      orderBy: [{ sequence: "asc" }, { name: "asc" }],
    });

    return ApiResponse.success(rows.map((row) => row.name));
  });
}

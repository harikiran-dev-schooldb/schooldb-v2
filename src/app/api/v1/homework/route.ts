import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import {
  requireRole,
  requireCurrentTeacher,
  requireTeacherClassSection,
} from "@/lib/auth";
import { validateBody } from "@/lib/validation";

import { homeworkSchema } from "@/features/homework/schemas/homework.schema";
import { homeworkService } from "@/features/homework/services/homework.service";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { notifyHomeworkPublished } from "@/features/notifications/events";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]);
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;
    const syllabusId = searchParams.get("syllabusId") ?? undefined;
    const branchId = searchParams.get("branchId") ?? undefined;
    const teacherScope = tenant.role === "TEACHER"
      ? await requireCurrentTeacher(tenant.schoolId).then((teacher) =>
          prisma.teacherAllocation.findMany({
            where: { schoolId: tenant.schoolId, teacherId: teacher.id, active: true },
            distinct: ["classId", "sectionId"],
            select: { classId: true, sectionId: true },
          }),
        )
      : undefined;
    const homework = await homeworkService.list(tenant.schoolId, {
      page,
      pageSize,
      search,
      syllabusId,
      branchId,
      teacherScope,
    });
    return ApiResponse.success(homework);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "TEACHER",
    ]);
    const body = await validateBody(req, homeworkSchema);

    if (tenant.role === "TEACHER" && !body.sectionId) {
      throw new Error("Teachers must select one of their assigned sections.");
    }

    await requireTeacherClassSection(body.classId, body.sectionId || undefined);

    let teacherContext:
      | { teacherId: string; academicYearId: string; subjectId?: string | null }
      | undefined;

    if (tenant.role === "TEACHER") {
      const teacher = await requireCurrentTeacher(tenant.schoolId);
      const classAssignment = await prisma.classTeacherAssignment.findFirst({
        where: {
          schoolId: tenant.schoolId,
          teacherId: teacher.id,
          classId: body.classId,
          sectionId: body.sectionId,
          active: true,
          academicYear: { active: true },
        },
        select: { academicYearId: true },
      });
      const subjectAllocation = classAssignment
        ? null
        : await prisma.teacherAllocation.findFirst({
            where: {
              schoolId: tenant.schoolId,
              teacherId: teacher.id,
              classId: body.classId,
              sectionId: body.sectionId,
              active: true,
              academicYear: { active: true },
            },
            orderBy: { subject: { displayOrder: "asc" } },
            select: { academicYearId: true, subjectId: true },
          });

      if (!classAssignment && !subjectAllocation) {
        throw new Error(
          "No active-year class or subject assignment is available for this section.",
        );
      }

      teacherContext = {
        teacherId: teacher.id,
        academicYearId:
          classAssignment?.academicYearId ?? subjectAllocation!.academicYearId,
        subjectId: subjectAllocation?.subjectId ?? null,
      };
    }

    const item = await homeworkService.create(
      tenant.schoolId,
      body,
      teacherContext,
    );
    if (item.active) {
      await notifyHomeworkPublished(item.id, tenant.schoolId);
    }
    await recordAuditLog({
      actor: tenant,
      module: "HOMEWORK",
      action: item.active ? "PUBLISH" : "CREATE",
      entityType: "HOMEWORK",
      entityId: item.id,
      summary: `${item.active ? "Published" : "Created draft"} homework: ${item.title}.`,
    });
    return ApiResponse.success(item, "Homework created successfully.", 201);
  });
}

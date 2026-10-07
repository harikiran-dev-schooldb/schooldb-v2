import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import {
  requireRole,
  requireCurrentTeacher,
  requireTeacherClassSection,
  requireTeacherFeatureAccess,
  teacherClassScope,
} from "@/lib/auth";
import { validateBody } from "@/lib/validation";

import { homeworkSchema } from "@/features/homework/schemas/homework.schema";
import { homeworkService } from "@/features/homework/services/homework.service";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { notifyHomeworkPublished } from "@/features/notifications/events";
import { runOfflineMutation } from "@/lib/offline-mutation";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]);
    if (tenant.role === "TEACHER") await requireTeacherFeatureAccess("HOMEWORK");
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;
    const syllabusId = searchParams.get("syllabusId") ?? undefined;
    const branchId = searchParams.get("branchId") ?? undefined;
    const teacherScope = tenant.role === "TEACHER"
      ? await teacherClassScope(tenant.schoolId)
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

    if (tenant.role === "TEACHER") await requireTeacherFeatureAccess("HOMEWORK");

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

    const mutation = await runOfflineMutation(
      req,
      tenant,
      "homework:create",
      async (mutationId) => {
        const item = await homeworkService.create(
          tenant.schoolId,
          body,
          teacherContext,
          mutationId,
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
        return item;
      },
    );
    return ApiResponse.success(
      mutation.data,
      mutation.replayed
        ? "Homework was already synchronized."
        : "Homework created successfully.",
      mutation.replayed ? 200 : 201,
    );
  });
}

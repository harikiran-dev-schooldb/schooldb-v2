import { z } from "zod";
import { apiHandler } from "@/lib/api";
import {
  requireClassTeacherClassSection,
  requireRole,
  requireTeacherFeatureAccess,
} from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

import { attendanceService } from "@/features/attendance/services/attendance.service";
import { recordAuditLog } from "@/lib/audit";

const fullPresentSchema = z
  .object({
    academicYearId: z.string().min(1),
    attendanceDate: z.string().min(1),
    scope: z.enum(["SCHOOL", "SYLLABUS", "BRANCH", "CLASS", "SECTION"]),
    syllabusId: z.string().optional(),
    branchId: z.string().optional(),
    classId: z.string().optional(),
    sectionId: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.scope === "SYLLABUS" && !value.syllabusId) {
      context.addIssue({ code: "custom", path: ["syllabusId"], message: "Syllabus is required." });
    }
    if (value.scope === "BRANCH" && (!value.syllabusId || !value.branchId)) {
      context.addIssue({ code: "custom", path: ["branchId"], message: "Syllabus and branch are required." });
    }
    if ((value.scope === "CLASS" || value.scope === "SECTION") && !value.classId) {
      context.addIssue({ code: "custom", path: ["classId"], message: "Class is required." });
    }
    if (value.scope === "SECTION" && !value.sectionId) {
      context.addIssue({ code: "custom", path: ["sectionId"], message: "Section is required." });
    }
  });

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]);
    const body = fullPresentSchema.parse(await req.json());

    if (tenant.role === "TEACHER") {
      await requireTeacherFeatureAccess("ATTENDANCE");
      if (body.scope !== "SECTION" || !body.classId || !body.sectionId) {
        return ApiResponse.error(
          "Teachers can mark attendance only for an assigned class section.",
          403,
        );
      }
      await requireClassTeacherClassSection(
        body.classId,
        body.sectionId,
        body.academicYearId,
      );
      const academicYear = await prisma.academicYear.findFirst({
        where: { id: body.academicYearId, schoolId: tenant.schoolId },
        select: { attendanceMode: true },
      });
      if (academicYear?.attendanceMode === "EVERY_PERIOD") {
        return ApiResponse.error(
          "Teachers must mark period attendance from their assigned timetable session.",
          403,
        );
      }
    }
    const result = await attendanceService.markFullPresent(
      tenant.schoolId,
      body,
    );

    await recordAuditLog({
      actor: tenant,
      module: "ATTENDANCE",
      action: "UPDATE",
      entityType: "ATTENDANCE_SESSION",
      summary: `Prepared ${result.sessionCount} attendance sessions with everyone present.`,
      metadata: {
        scope: body.scope,
        syllabusId: body.syllabusId ?? null,
        branchId: body.branchId ?? null,
        attendanceDate: body.attendanceDate,
        classId: body.classId ?? null,
        sectionId: body.sectionId ?? null,
      },
    });

    return ApiResponse.success(
      result,
      "Everyone was marked present. Select any absentees, then finalize attendance.",
    );
  });
}

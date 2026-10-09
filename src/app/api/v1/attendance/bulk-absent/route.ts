import { z } from "zod";
import { after } from "next/server";

import { attendanceService } from "@/features/attendance/services/attendance.service";
import { notifyAttendanceLocked } from "@/features/notifications/events";
import {
  processAutomatedCampaign,
  queueAttendanceSessionAlert,
} from "@/features/whatsapp/automation";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import {
  requireClassTeacherClassSection,
  requireRole,
  requireTeacherFeatureAccess,
} from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    academicYearId: z.string().min(1),
    attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scope: z.enum(["SCHOOL", "SYLLABUS", "BRANCH", "CLASS", "SECTION"]),
    syllabusId: z.string().optional(),
    branchId: z.string().optional(),
    classId: z.string().optional(),
    sectionId: z.string().optional(),
    studentIds: z.array(z.string().min(1)).max(500),
    sessionChoice: z.enum(["MORNING", "AFTERNOON", "BOTH"]).optional(),
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

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]);
    const parsed = schema.safeParse(await request.json());

    if (!parsed.success) {
      return ApiResponse.error(parsed.error.issues[0]?.message || "Invalid absentee selection.", 400);
    }

    if (tenant.role === "TEACHER") {
      await requireTeacherFeatureAccess("ATTENDANCE");
      if (
        parsed.data.scope !== "SECTION" ||
        !parsed.data.classId ||
        !parsed.data.sectionId
      ) {
        return ApiResponse.error(
          "Teachers can finalize attendance only for an assigned class section.",
          403,
        );
      }
      await requireClassTeacherClassSection(
        parsed.data.classId,
        parsed.data.sectionId,
        parsed.data.academicYearId,
      );
      const academicYear = await prisma.academicYear.findFirst({
        where: { id: parsed.data.academicYearId, schoolId: tenant.schoolId },
        select: { attendanceMode: true },
      });
      if (academicYear?.attendanceMode === "EVERY_PERIOD") {
        return ApiResponse.error(
          "Teachers must finalize period attendance from their assigned timetable session.",
          403,
        );
      }
    }

    const result = await attendanceService.markBulkAbsentees(
      tenant.schoolId,
      parsed.data,
    );

    await Promise.all(
      (result.lockedSessionIds ?? []).map((sessionId) =>
        notifyAttendanceLocked(sessionId, tenant.schoolId),
      ),
    );
    const campaigns = await Promise.all(
      (result.lockedSessionIds ?? []).map((sessionId) =>
        queueAttendanceSessionAlert(tenant.schoolId, sessionId),
      ),
    );
    for (const campaign of campaigns) {
      if (campaign) after(() => processAutomatedCampaign(campaign.id));
    }

    await recordAuditLog({
      actor: tenant,
      module: "ATTENDANCE",
      action: "UPDATE",
      entityType: "ATTENDANCE_SESSION",
      summary: `Marked ${result.studentCount} students absent across ${result.sessionCount} attendance sessions.`,
      metadata: {
        scope: parsed.data.scope,
        syllabusId: parsed.data.syllabusId ?? null,
        branchId: parsed.data.branchId ?? null,
        attendanceDate: parsed.data.attendanceDate,
        classId: parsed.data.classId ?? null,
        sectionId: parsed.data.sectionId ?? null,
        studentIds: parsed.data.studentIds,
      },
    });

    return ApiResponse.success(
      result,
      result.studentCount === 0
        ? "Attendance finalized with everyone present."
        : `${result.studentCount} students marked absent and attendance finalized successfully.`,
    );
  });
}

import { after } from "next/server";
import { z } from "zod";

import { attendanceService } from "@/features/attendance/services/attendance.service";
import { offlineAttendanceConflict } from "@/features/attendance/offline-conflict";
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
  requireTeacherTimetable,
} from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { runOfflineMutation } from "@/lib/offline-mutation";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

const schema = z
  .object({
    academicYearId: z.string().min(1),
    attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    classId: z.string().min(1),
    sectionId: z.string().min(1),
    sessionType: z.enum(["DAILY", "MORNING", "AFTERNOON", "PERIOD"]),
    timetableId: z.string().nullable().optional(),
    periodId: z.string().nullable().optional(),
    sessionId: z.string().nullable().optional(),
    baseUpdatedAt: z.string().datetime().nullable().optional(),
    attendance: z
      .array(
        z.object({
          studentId: z.string().min(1),
          status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
          remarks: z.string().max(500).optional(),
        }),
      )
      .min(1)
      .max(600),
  })
  .superRefine((value, context) => {
    if (value.sessionType === "PERIOD" && (!value.timetableId || !value.periodId)) {
      context.addIssue({
        code: "custom",
        path: ["timetableId"],
        message: "Timetable details are required for period attendance.",
      });
    }
  });

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return ApiResponse.error(parsed.error.issues[0]?.message || "Invalid offline attendance.", 400);
    }
    const input = parsed.data;

    if (tenant.role === "TEACHER") {
      await requireTeacherFeatureAccess("ATTENDANCE");
      if (input.sessionType === "PERIOD") {
        await requireTeacherTimetable(input.timetableId!);
      } else {
        await requireClassTeacherClassSection(
          input.classId,
          input.sectionId,
          input.academicYearId,
        );
      }
    }

    const mutation = await runOfflineMutation(
      request,
      tenant,
      `attendance-finalize:${input.academicYearId}:${input.classId}:${input.sectionId}:${input.sessionType}:${input.periodId ?? "none"}:${input.attendanceDate}`,
      async () => {
        const attendanceDate = new Date(`${input.attendanceDate}T00:00:00.000Z`);
        const existing = await prisma.attendanceSession.findFirst({
          where: {
            schoolId: tenant.schoolId,
            academicYearId: input.academicYearId,
            classId: input.classId,
            sectionId: input.sectionId,
            attendanceDate,
            sessionType: input.sessionType,
            ...(input.sessionType === "PERIOD" ? { periodId: input.periodId! } : {}),
          },
          select: {
            id: true,
            updatedAt: true,
            locked: true,
            _count: { select: { records: true } },
          },
        });

        const conflict = offlineAttendanceConflict(
          existing
            ? {
                id: existing.id,
                updatedAt: existing.updatedAt,
                locked: existing.locked,
                recordCount: existing._count.records,
              }
            : null,
          input,
        );
        if (conflict) throw new ApiError(409, conflict);

        const session = existing ?? await attendanceService.createSession(tenant.schoolId, {
          academicYearId: input.academicYearId,
          attendanceDate: input.attendanceDate,
          classId: input.classId,
          sectionId: input.sectionId,
          sessionType: input.sessionType,
          timetableId: input.timetableId ?? undefined,
        });

        await attendanceService.markAttendance(
          tenant.schoolId,
          {
            sessionId: session.id,
            attendance: input.attendance,
          },
          true,
        );

        return { id: session.id, locked: true };
      },
    );

    if (!mutation.replayed) {
      await notifyAttendanceLocked(mutation.data.id, tenant.schoolId, tenant.userId);
      const campaign = await queueAttendanceSessionAlert(tenant.schoolId, mutation.data.id);
      if (campaign) after(() => processAutomatedCampaign(campaign.id));
      await recordAuditLog({
        actor: tenant,
        module: "ATTENDANCE",
        action: "LOCK",
        entityType: "ATTENDANCE_SESSION",
        entityId: mutation.data.id,
        summary: "Synchronized and finalized an offline attendance register.",
      });
    }

    return ApiResponse.success(
      mutation.data,
      mutation.replayed
        ? "Offline attendance was already synchronized."
        : "Offline attendance synchronized and finalized.",
    );
  });
}

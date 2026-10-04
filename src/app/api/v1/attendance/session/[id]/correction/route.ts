import { z } from "zod";
import { after } from "next/server";

import { apiHandler } from "@/lib/api";
import { requireTeacherAttendanceSession } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";
import { notifyStudentAttendancePresentCorrection } from "@/features/notifications/events";
import {
  processAutomatedCampaign,
  queueStudentAttendanceCorrectionAlert,
} from "@/features/whatsapp/automation";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const correctionSchema = z.object({
  changes: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
        remarks: z.string().optional(),
      }),
    )
    .min(1),
});

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const { id } = await params;
    const tenant = await requireTeacherAttendanceSession(id);

    const body = await req.json();
    const input = correctionSchema.parse(body);

    const sessionBefore = await prisma.attendanceSession.findFirst({
      where: { id, schoolId: tenant.schoolId },
      select: {
        attendanceDate: true,
        class: { select: { name: true } },
        section: { select: { name: true } },
        records: {
          where: { studentId: { in: input.changes.map((change) => change.studentId) } },
          select: {
            studentId: true,
            status: true,
            student: { select: { fullName: true, admissionNo: true } },
          },
        },
      },
    });
    if (!sessionBefore) throw new Error("Attendance session not found.");
    const previousByStudent = new Map(
      sessionBefore.records.map((record) => [record.studentId, record]),
    );

    const result = await attendanceService.bulkUpdateAttendance(
      tenant.schoolId,
      id,
      input.changes,
    );

    const correctionId = `${id}:${Date.now()}`;
    await prisma.studentActivity.createMany({
      data: input.changes.map((change) => ({
        schoolId: tenant.schoolId,
        studentId: change.studentId,
        performedByUserId: tenant.userId,
        type: "ATTENDANCE_MARKED" as const,
        title: "Attendance corrected",
        description: `Attendance was corrected to ${change.status.toLowerCase()}.`,
        sourceType: "ATTENDANCE_CORRECTION",
        sourceId: correctionId,
        metadata: { sessionId: id, status: change.status },
      })),
    });

    const correctedToPresent = input.changes.flatMap((change) => {
      const previous = previousByStudent.get(change.studentId);
      return previous?.status === "ABSENT" && change.status === "PRESENT"
        ? [{
            studentId: change.studentId,
            studentName: previous.student.fullName?.trim() || previous.student.admissionNo,
          }]
        : [];
    });
    const classLabel = `${sessionBefore.class.name} - ${sessionBefore.section.name}`;
    for (const correction of correctedToPresent) {
      await notifyStudentAttendancePresentCorrection({
        schoolId: tenant.schoolId,
        studentId: correction.studentId,
        sessionId: id,
        attendanceDate: sessionBefore.attendanceDate,
        classLabel,
      });
      const campaign = await queueStudentAttendanceCorrectionAlert({
        schoolId: tenant.schoolId,
        sessionId: id,
        studentId: correction.studentId,
        studentName: correction.studentName,
        attendanceDate: sessionBefore.attendanceDate,
      });
      if (campaign) after(() => processAutomatedCampaign(campaign.id));
    }

    await recordAuditLog({
      actor: tenant,
      module: "ATTENDANCE",
      action: "CORRECT",
      entityType: "ATTENDANCE_SESSION",
      entityId: id,
      summary: `Corrected ${input.changes.length} attendance record${input.changes.length === 1 ? "" : "s"}.`,
      metadata: {
        recordCount: input.changes.length,
        correctedAbsentToPresent: correctedToPresent.length,
      },
    });

    return ApiResponse.success(result, "Attendance corrected successfully.");
  });
}

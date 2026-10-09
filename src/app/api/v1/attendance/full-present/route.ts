import { z } from "zod";
import { after } from "next/server";

import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { attendanceService } from "@/features/attendance/services/attendance.service";
import { notifyAttendanceLocked } from "@/features/notifications/events";
import {
  processAutomatedCampaign,
  queueAttendanceSessionAlert,
} from "@/features/whatsapp/automation";
import { recordAuditLog } from "@/lib/audit";

const fullPresentSchema = z.object({
  academicYearId: z.string().min(1),
  attendanceDate: z.string().min(1),
  scope: z.enum(["SCHOOL", "CLASS", "SECTION"]),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
});

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = fullPresentSchema.parse(await req.json());
    const result = await attendanceService.markFullPresent(
      tenant.schoolId,
      body,
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
      action: "LOCK",
      entityType: "ATTENDANCE_SESSION",
      summary: `Marked everyone present and finalized ${result.lockedSessionIds?.length ?? 0} attendance sessions.`,
      metadata: {
        scope: body.scope,
        attendanceDate: body.attendanceDate,
        classId: body.classId ?? null,
        sectionId: body.sectionId ?? null,
      },
    });

    return ApiResponse.success(
      result,
      "Attendance marked present and finalized successfully.",
    );
  });
}

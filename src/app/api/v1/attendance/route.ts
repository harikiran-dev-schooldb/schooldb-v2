import { apiHandler } from "@/lib/api";
import { after } from "next/server";
import {
  requireRole,
  requireTeacherAttendanceSession,
  requireTenant,
  requireTeacherFeatureAccess,
} from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

import { attendanceSchema } from "@/features/attendance/schemas/attendance.schema";
import { attendanceService } from "@/features/attendance/services/attendance.service";
import { notifyAttendanceLocked } from "@/features/notifications/events";
import {
  processAutomatedCampaign,
  queueAttendanceSessionAlert,
} from "@/features/whatsapp/automation";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    if (tenant.role === "TEACHER") await requireTeacherFeatureAccess("ATTENDANCE");
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;

    const result = await attendanceService.list(tenant.schoolId, {
      page,
      pageSize,
      search,
    });

    return ApiResponse.success(result);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "TEACHER",
    ]);
    const body = await validateBody(req, attendanceSchema);

    if (tenant.role === "TEACHER") await requireTeacherFeatureAccess("ATTENDANCE");

    await requireTeacherAttendanceSession(body.sessionId);

    const result = await attendanceService.markAttendance(
      tenant.schoolId,
      body,
      body.finalize === true,
    );

    let campaignQueued = false;
    if (body.finalize) {
      await notifyAttendanceLocked(body.sessionId, tenant.schoolId);
      const campaign = await queueAttendanceSessionAlert(tenant.schoolId, body.sessionId);
      campaignQueued = Boolean(campaign);
      if (campaign) after(() => processAutomatedCampaign(campaign.id));
    }

    await recordAuditLog({
      actor: tenant,
      module: "ATTENDANCE",
      action: body.finalize ? "LOCK" : "UPDATE",
      entityType: "ATTENDANCE_SESSION",
      entityId: body.sessionId,
      summary: body.finalize
        ? "Saved and finalized student attendance for a session."
        : "Saved student attendance for a session.",
      metadata: body.finalize ? { whatsappCampaignQueued: campaignQueued } : undefined,
    });

    return ApiResponse.success(
      result,
      body.finalize
        ? "Attendance saved and locked successfully."
        : "Attendance saved successfully.",
    );
  });
}

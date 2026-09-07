import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { after } from "next/server";

import { attendanceService } from "@/features/attendance/services/attendance.service";
import { processAutomatedCampaign, queueAttendanceSessionAlert } from "@/features/whatsapp/automation";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);

    const { id } = await params;

    const result = await attendanceService.lockAttendanceSession(
      tenant.schoolId,
      id,
    );
    const campaign = await queueAttendanceSessionAlert(tenant.schoolId, id);
    if (campaign) after(() => processAutomatedCampaign(campaign.id));

    return ApiResponse.success(
      result,
      "Attendance session locked successfully.",
    );
  });
}

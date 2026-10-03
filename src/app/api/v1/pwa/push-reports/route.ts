import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug")?.trim();
    if (!schoolSlug) return ApiResponse.error("School is required.", 400);
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
    const reports = await prisma.pushDeliveryReport.findMany({
      where: { schoolId: membership.schoolId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        announcementId: true,
        kind: true,
        title: true,
        audienceUsers: true,
        preferenceEnabledUsers: true,
        eligibleDevices: true,
        noDeviceUsers: true,
        iosDevices: true,
        standardWebDevices: true,
        firebaseDevices: true,
        accepted: true,
        failed: true,
        invalidDevices: true,
        status: true,
        createdAt: true,
      },
    });
    return ApiResponse.success(reports);
  });
}

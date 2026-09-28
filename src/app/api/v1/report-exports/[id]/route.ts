import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await params;
    const job = await prisma.reportExportJob.findFirst({
      where: {
        id,
        schoolId: membership.schoolId,
        requestedByUserId: membership.userId,
      },
      select: {
        id: true,
        status: true,
        filename: true,
        rowCount: true,
        error: true,
        createdAt: true,
        completedAt: true,
        expiresAt: true,
      },
    });
    if (!job) throw new ApiError(404, "Report export was not found.");
    return ApiResponse.success(job);
  });
}

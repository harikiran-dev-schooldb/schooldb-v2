import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { readPrivateReportExport } from "@/lib/private-storage";
import { prisma } from "@/lib/prisma";

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
        status: "READY",
      },
      select: { storageKey: true, filename: true, contentType: true, expiresAt: true },
    });
    if (!job?.storageKey) throw new ApiError(404, "Report export is not ready.");
    if (job.expiresAt && job.expiresAt <= new Date()) {
      throw new ApiError(410, "This report export has expired. Please create it again.");
    }

    const contents = await readPrivateReportExport(job.storageKey);
    return new Response(new Uint8Array(contents), {
      headers: {
        "Content-Type": job.contentType || "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${(job.filename || "schooldb-report.csv").replaceAll('"', "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}

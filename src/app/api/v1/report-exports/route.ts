import { after } from "next/server";
import { z } from "zod";

import {
  processReportExportJob,
  queueSchoolReportExport,
} from "@/features/reports/report-export.service";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

const filtersSchema = z.object({
  academicYearId: z.string().trim().max(100).optional(),
  classId: z.string().trim().max(100).optional(),
  sectionId: z.string().trim().max(100).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const filters = filtersSchema.parse(await request.json());
    const job = await queueSchoolReportExport({
      schoolId: membership.schoolId,
      requestedByUserId: membership.userId,
      filters,
    });

    after(() => processReportExportJob(job.id));
    await recordAuditLog({
      actor: membership,
      module: "SYSTEM",
      action: "EXPORT",
      entityType: "REPORT_EXPORT_JOB",
      entityId: job.id,
      summary: "Queued a private school analytics report export.",
      metadata: filters,
    });

    return ApiResponse.success(
      { id: job.id, status: job.status },
      "Your report is being prepared.",
      202,
    );
  });
}

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const jobs = await prisma.reportExportJob.findMany({
      where: {
        schoolId: membership.schoolId,
        requestedByUserId: membership.userId,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
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
    return ApiResponse.success(jobs);
  });
}

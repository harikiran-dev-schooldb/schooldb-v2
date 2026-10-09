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
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const [jobs, downloads] = await Promise.all([
      prisma.reportExportJob.findMany({
        where: {
          schoolId: membership.schoolId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          status: true,
          filename: true,
          rowCount: true,
          error: true,
          createdAt: true,
          completedAt: true,
          expiresAt: true,
          requestedBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              memberships: {
                where: { schoolId: membership.schoolId },
                take: 1,
                select: { role: true },
              },
            },
          },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          schoolId: membership.schoolId,
          action: "EXPORT",
          entityType: { in: ["REPORT_DOWNLOAD", "EXPENSE_REPORT", "SCHOOL_SNAPSHOT"] },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          entityType: true,
          summary: true,
          metadata: true,
          actorName: true,
          actorRole: true,
          createdAt: true,
        },
      }),
    ]);

    const directDownloads = downloads.map((item) => {
      const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
        ? item.metadata as Record<string, unknown>
        : {};
      const title = typeof metadata.reportTitle === "string"
        ? metadata.reportTitle
        : typeof metadata.reportName === "string"
          ? metadata.reportName
          : item.entityType === "EXPENSE_REPORT"
            ? "Expense report"
            : item.entityType === "SCHOOL_SNAPSHOT"
              ? "School data snapshot"
              : item.summary.replace(/^(Downloaded|Exported)\s+|\.$/g, "");
      const format = typeof metadata.format === "string"
        ? metadata.format
        : item.entityType === "SCHOOL_SNAPSHOT"
          ? "JSON"
          : "XLSX";
      const rowCount = typeof metadata.rowCount === "number" ? metadata.rowCount : null;
      return {
        id: item.id,
        status: "DOWNLOADED" as const,
        filename: `${title}.${format.toLowerCase()}`,
        rowCount,
        error: null,
        createdAt: item.createdAt,
        completedAt: item.createdAt,
        expiresAt: null,
        direct: true,
        performedBy: item.actorName,
        performedByRole: item.actorRole,
        reportType: title,
      };
    });
    const deduplicatedDownloads = directDownloads.filter((item, index, items) => {
      const normalized = item.filename.toLowerCase().replace(/[^a-z0-9]/g, "");
      return !items.slice(0, index).some((previous) =>
        previous.filename.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized &&
        Math.abs(previous.createdAt.getTime() - item.createdAt.getTime()) < 5_000,
      );
    });

    const queuedJobs = jobs.map(({ requestedBy, ...job }) => ({
      ...job,
      direct: false,
      performedBy: [requestedBy.firstName, requestedBy.lastName].filter(Boolean).join(" ") || requestedBy.email,
      performedByRole: requestedBy.memberships[0]?.role ?? null,
      reportType: "School summary",
    }));
    const history = [...queuedJobs, ...deduplicatedDownloads]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 100);
    return ApiResponse.success(history);
  });
}

import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

const reportCatalog = {
  payroll: { title: "Current-month payroll", format: "CSV" },
  "certificate-audit": { title: "Certificate audit", format: "CSV" },
} as const;

const schema = z.object({ reportId: z.enum(Object.keys(reportCatalog) as [keyof typeof reportCatalog, ...(keyof typeof reportCatalog)[]]) });

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { reportId } = schema.parse(await request.json());
    const report = reportCatalog[reportId];

    await recordAuditLog({
      actor: membership,
      module: "SYSTEM",
      action: "EXPORT",
      entityType: "REPORT_DOWNLOAD",
      entityId: reportId,
      summary: `Downloaded ${report.title}.`,
      metadata: { reportId, reportTitle: report.title, format: report.format },
    });

    return ApiResponse.success({ reportId }, "Report download recorded.");
  });
}

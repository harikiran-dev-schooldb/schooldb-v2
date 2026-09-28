import type { Prisma } from "@/generated/prisma/client";

import { getSchoolReport, type ReportFilterInput } from "@/features/reports/report.service";
import {
  deletePrivateReportExport,
  savePrivateReportExport,
} from "@/lib/private-storage";
import { prisma } from "@/lib/prisma";

const REPORT_EXPORT_RETENTION_DAYS = 7;
const MAX_EXPORT_ATTEMPTS = 3;

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function row(...values: Array<string | number>) {
  return values.map(csvCell).join(",");
}

function filtersFromJson(value: Prisma.JsonValue): ReportFilterInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: ReportFilterInput = {};
  for (const key of ["academicYearId", "classId", "sectionId", "from", "to"] as const) {
    if (typeof source[key] === "string" && source[key]) result[key] = source[key];
  }
  return result;
}

export function createSchoolReportCsv(
  report: NonNullable<Awaited<ReturnType<typeof getSchoolReport>>>,
) {
  const lines = [
    row("SchoolDB Reports & Analytics"),
    row("Academic year", report.scope.academicYearName),
    row("Class", report.scope.className),
    row("Section", report.scope.sectionName),
    row("Period", `${report.scope.from} to ${report.scope.to}`),
    "",
    row("Overview", "Value"),
    row("Students", report.students.total),
    row("Attendance percentage", `${report.attendance.percentage}%`),
    row("Attendance sessions", report.attendance.sessions),
    row("Fees collected", report.fees.collected),
    row("Outstanding fees", report.fees.outstanding),
    row("Average exam score", `${report.academics.averagePercentage}%`),
    row("Exam pass percentage", `${report.academics.passPercentage}%`),
    row("Homework published", report.academics.homework),
    row("Overdue library loans", report.operations.overdueLoans),
    row("Transport assignments", report.operations.transportAssignments),
    "",
    row("Attendance", "Count"),
    row("Present", report.attendance.present),
    row("Absent", report.attendance.absent),
    row("Late", report.attendance.late),
    row("Leave", report.attendance.leave),
    "",
    row("Class strength", "Students"),
    ...report.students.classes.map((item) => row(item.name, item.count)),
    "",
    row("Subject performance", "Entries", "Average %", "Pass %"),
    ...report.academics.subjects.map((item) =>
      row(item.name, item.entries, item.averagePercentage, item.passPercentage),
    ),
    "",
    row(
      "Low attendance students",
      "Admission no.",
      "Class",
      "Section",
      "Present",
      "Total",
      "Attendance %",
    ),
    ...report.attendance.low.map((item) =>
      row(
        item.fullName,
        item.admissionNo,
        item.className,
        item.sectionName,
        item.present,
        item.total,
        item.percentage,
      ),
    ),
  ];

  return {
    contents: Buffer.from(`\uFEFF${lines.join("\r\n")}`, "utf8"),
    filename: `schooldb-report-${report.scope.from}-${report.scope.to}.csv`,
    rowCount: lines.length,
  };
}

export async function queueSchoolReportExport(input: {
  schoolId: string;
  requestedByUserId: string;
  filters: ReportFilterInput;
}) {
  return prisma.reportExportJob.create({
    data: {
      schoolId: input.schoolId,
      requestedByUserId: input.requestedByUserId,
      filters: input.filters as Prisma.InputJsonValue,
    },
  });
}

export async function processReportExportJob(jobId: string) {
  const job = await prisma.reportExportJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "READY" || job.status === "EXPIRED") return job;

  const claimed = await prisma.reportExportJob.updateMany({
    where: {
      id: jobId,
      status: { in: ["QUEUED", "FAILED"] },
      attempts: { lt: MAX_EXPORT_ATTEMPTS },
    },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      error: null,
      attempts: { increment: 1 },
    },
  });
  if (claimed.count !== 1) return job;

  try {
    const report = await getSchoolReport(job.schoolId, filtersFromJson(job.filters));
    if (!report) throw new Error("Create an academic year before exporting reports.");

    const output = createSchoolReportCsv(report);
    const storageKey = await savePrivateReportExport(output.contents);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REPORT_EXPORT_RETENTION_DAYS);

    return await prisma.reportExportJob.update({
      where: { id: jobId },
      data: {
        status: "READY",
        filename: output.filename,
        contentType: "text/csv; charset=utf-8",
        storageKey,
        rowCount: output.rowCount,
        completedAt: new Date(),
        expiresAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed";
    await prisma.reportExportJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: message.slice(0, 1000) },
    });
    console.error("REPORT EXPORT FAILED", { jobId, error });
    return null;
  }
}

export async function processPendingReportExports(limit = 3) {
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
  await prisma.reportExportJob.updateMany({
    where: { status: "PROCESSING", startedAt: { lt: staleBefore } },
    data: { status: "QUEUED", error: "Recovered after an interrupted worker." },
  });

  const jobs = await prisma.reportExportJob.findMany({
    where: {
      status: { in: ["QUEUED", "FAILED"] },
      attempts: { lt: MAX_EXPORT_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  const results = await Promise.all(jobs.map((job) => processReportExportJob(job.id)));
  return results.filter((job) => job?.status === "READY").length;
}

export async function cleanupExpiredReportExports(limit = 20) {
  const jobs = await prisma.reportExportJob.findMany({
    where: { status: "READY", expiresAt: { lte: new Date() } },
    orderBy: { expiresAt: "asc" },
    take: limit,
    select: { id: true, storageKey: true },
  });

  let cleaned = 0;
  for (const job of jobs) {
    if (job.storageKey) await deletePrivateReportExport(job.storageKey);
    await prisma.reportExportJob.update({
      where: { id: job.id },
      data: { status: "EXPIRED", storageKey: null },
    });
    cleaned += 1;
  }
  return cleaned;
}

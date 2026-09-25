import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchoolReportWorkbook, reportDateRange, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const q = request.nextUrl.searchParams;
  const search = q.get("q")?.trim() || "";
  const status = ["ISSUED", "CANCELLED"].includes(q.get("status") || "") ? q.get("status") as "ISSUED" | "CANCELLED" : undefined;
  const type = ["BONAFIDE", "STUDY", "TRANSFER"].includes(q.get("type") || "") ? q.get("type") as "BONAFIDE" | "STUDY" | "TRANSFER" : undefined;
  const classId = q.get("classId") || "";
  const sectionId = q.get("sectionId") || "";
  const from = q.get("fromDate") || undefined;
  const to = q.get("toDate") || undefined;

  const where: Prisma.CertificateIssueWhereInput = {
    schoolId: tenant.schoolId,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(from || to ? { issuedAt: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {}),
    ...((classId || sectionId) ? { student: { enrollments: { some: { active: true, ...(classId ? { classId } : {}), ...(sectionId ? { sectionId } : {}) } } } } : {}),
    ...(search ? { OR: [{ certificateNo: { contains: search, mode: "insensitive" } }, { student: { fullName: { contains: search, mode: "insensitive" } } }, { student: { admissionNo: { contains: search, mode: "insensitive" } } }] } : {}),
  };

  const [school, issues] = await Promise.all([
    prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } }),
    prisma.certificateIssue.findMany({
      where, orderBy: { issuedAt: "desc" },
      select: {
        certificateNo: true, type: true, status: true, purpose: true, issuedAt: true, issuedByName: true, printCount: true,
        lastPrintedAt: true, cancelledAt: true, cancelledByName: true, cancellationNote: true,
        student: { select: { admissionNo: true, fullName: true, enrollments: { where: { active: true }, orderBy: { academicYear: { startDate: "desc" } }, take: 1, select: { rollNo: true, academicYear: { select: { name: true } }, class: { select: { name: true } }, section: { select: { name: true } } } } } },
      },
    }),
  ]);
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const workbook = await createSchoolReportWorkbook({
    schoolName: school.name,
    reportName: "Certificate Issue Register",
    periodLabel: reportDateRange(from, to),
    sheetName: "Certificates",
    rows: issues,
    columns: [
      { header: "S.No", key: "serial", width: 8, value: (_r, i) => i + 1 },
      { header: "Certificate No", key: "certificateNo", width: 30, value: r => r.certificateNo },
      { header: "Type", key: "type", width: 14, value: r => r.type },
      { header: "Status", key: "status", width: 14, value: r => r.status },
      { header: "Admission No", key: "admissionNo", width: 16, value: r => r.student.admissionNo },
      { header: "Student Name", key: "student", width: 30, value: r => r.student.fullName },
      { header: "Academic Year", key: "year", width: 16, value: r => r.student.enrollments[0]?.academicYear.name },
      { header: "Class", key: "class", width: 12, value: r => r.student.enrollments[0]?.class.name },
      { header: "Section", key: "section", width: 10, value: r => r.student.enrollments[0]?.section.name },
      { header: "Roll No", key: "roll", width: 10, value: r => r.student.enrollments[0]?.rollNo },
      { header: "Purpose", key: "purpose", width: 32, value: r => r.purpose },
      { header: "Issued At", key: "issuedAt", width: 20, value: r => r.issuedAt, numFmt: "dd-mm-yyyy hh:mm" },
      { header: "Issued By", key: "issuedBy", width: 24, value: r => r.issuedByName },
      { header: "Print Count", key: "printCount", width: 12, value: r => r.printCount },
      { header: "Last Printed At", key: "lastPrinted", width: 20, value: r => r.lastPrintedAt, numFmt: "dd-mm-yyyy hh:mm" },
      { header: "Cancelled At", key: "cancelledAt", width: 20, value: r => r.cancelledAt, numFmt: "dd-mm-yyyy hh:mm" },
      { header: "Cancelled By", key: "cancelledBy", width: 24, value: r => r.cancelledByName },
      { header: "Cancellation Note", key: "cancellationNote", width: 34, value: r => r.cancellationNote },
    ],
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${safeReportFilename(school.name)}-certificate-register.xlsx"`,
    "Cache-Control": "no-store",
  } });
}

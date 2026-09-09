import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  const classId = url.searchParams.get("classId") || "";
  const sectionId = url.searchParams.get("sectionId") || "";
  const issues = await prisma.certificateIssue.findMany({
    where: { schoolId: membership.schoolId, ...(["ISSUED", "CANCELLED"].includes(status || "") ? { status: status as "ISSUED" | "CANCELLED" } : {}), ...(["BONAFIDE", "STUDY", "TRANSFER"].includes(type || "") ? { type: type as "BONAFIDE" | "STUDY" | "TRANSFER" } : {}), ...((classId || sectionId) ? { student: { enrollments: { some: { active: true, ...(classId ? { classId } : {}), ...(sectionId ? { sectionId } : {}) } } } } : {}), ...(q ? { OR: [{ certificateNo: { contains: q, mode: "insensitive" } }, { student: { fullName: { contains: q, mode: "insensitive" } } }, { student: { admissionNo: { contains: q, mode: "insensitive" } } }] } : {}) },
    orderBy: { issuedAt: "desc" },
    take: 5000,
    select: { certificateNo: true, type: true, status: true, purpose: true, issuedAt: true, issuedByName: true, printCount: true, cancelledAt: true, cancelledByName: true, cancellationNote: true, student: { select: { admissionNo: true, fullName: true } } },
  });
  const rows = [["Certificate Number", "Type", "Status", "Admission Number", "Student", "Purpose", "Issued At", "Issued By", "Print Count", "Cancelled At", "Cancelled By", "Cancellation Note"], ...issues.map((issue) => [issue.certificateNo, issue.type, issue.status, issue.student.admissionNo, issue.student.fullName || "", issue.purpose || "", issue.issuedAt.toISOString(), issue.issuedByName, issue.printCount, issue.cancelledAt?.toISOString() || "", issue.cancelledByName || "", issue.cancellationNote || ""])];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="certificate-register-${new Date().toISOString().slice(0, 10)}.csv"` } });
}

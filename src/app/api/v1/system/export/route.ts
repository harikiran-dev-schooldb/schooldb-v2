import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  const schoolId = membership.schoolId;
  const [
    school,
    academicYears,
    classes,
    sections,
    subjects,
    students,
    enrollments,
    teachers,
    feeCategories,
    feePayments,
    announcements,
  ] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, slug: true, logo: true, createdAt: true, updatedAt: true },
    }),
    prisma.academicYear.findMany({ where: { schoolId }, orderBy: { startDate: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
    prisma.section.findMany({ where: { class: { schoolId } }, orderBy: [{ classId: "asc" }, { name: "asc" }] }),
    prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ where: { schoolId }, orderBy: { admissionNo: "asc" }, take: 25_000 }),
    prisma.studentEnrollment.findMany({ where: { schoolId }, orderBy: { createdAt: "asc" }, take: 25_000 }),
    prisma.teacher.findMany({ where: { schoolId }, orderBy: { employeeId: "asc" }, take: 10_000 }),
    prisma.feeCategory.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.feePayment.findMany({ where: { schoolId }, orderBy: { paymentDate: "asc" }, take: 25_000 }),
    prisma.announcement.findMany({ where: { schoolId }, orderBy: { createdAt: "asc" }, take: 10_000 }),
  ]);

  const snapshot = {
    format: "schooldb-operational-snapshot",
    version: 1,
    exportedAt: new Date().toISOString(),
    school,
    data: {
      academicYears,
      classes,
      sections,
      subjects,
      students,
      enrollments,
      teachers,
      feeCategories,
      feePayments,
      announcements,
    },
    notice:
      "This school-scoped operational snapshot is not a replacement for a provider-managed PostgreSQL backup.",
  };

  await recordAuditLog({
    actor: membership,
    module: "SYSTEM",
    action: "EXPORT",
    entityType: "SCHOOL_SNAPSHOT",
    entityId: schoolId,
    summary: "Downloaded a school operational data snapshot.",
  });

  const safeSlug = school?.slug.replace(/[^a-z0-9-]/gi, "-") || "school";
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeSlug}-snapshot-${date}.json"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

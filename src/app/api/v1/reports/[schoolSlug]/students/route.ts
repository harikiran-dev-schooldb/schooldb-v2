import { NextRequest, NextResponse } from "next/server";

import { StudentStatus } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/access-control";
import { requireCurrentTeacher, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchoolReportWorkbook, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const tenant = await requirePermission(PERMISSIONS.STUDENT_DIRECTORY_READ);
  const q = request.nextUrl.searchParams;
  const search = q.get("search")?.trim() || undefined;
  const classId = q.get("classId") || undefined;
  const sectionId = q.get("sectionId") || undefined;
  const statusValue = q.get("status") || "ACTIVE";
  const status = Object.values(StudentStatus).includes(statusValue as StudentStatus) ? statusValue as StudentStatus : StudentStatus.ACTIVE;

  let teacherScope: Array<{ classId: string; sectionId: string }> | undefined;
  if (tenant.role === "TEACHER") {
    const teacher = await requireCurrentTeacher(tenant.schoolId);
    teacherScope = await prisma.teacherAllocation.findMany({
      where: { schoolId: tenant.schoolId, teacherId: teacher.id, active: true },
      distinct: ["classId", "sectionId"],
      select: { classId: true, sectionId: true },
    });
  }

  const enrollmentFilter = {
    active: true,
    ...(classId ? { classId } : {}),
    ...(sectionId ? { sectionId } : {}),
    ...(teacherScope ? { OR: teacherScope.map((scope) => ({ classId: scope.classId, sectionId: scope.sectionId })) } : {}),
  };

  const [school, students] = await Promise.all([
    prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } }),
    prisma.student.findMany({
      where: {
        schoolId: tenant.schoolId,
        status,
        ...(search ? { OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { admissionNo: { contains: search, mode: "insensitive" } },
        ] } : {}),
        ...(classId || sectionId || teacherScope ? { enrollments: { some: enrollmentFilter } } : {}),
      },
      orderBy: [{ fullName: "asc" }, { admissionNo: "asc" }],
      select: {
        admissionNo: true, fullName: true, gender: true, dob: true, joinedDate: true, status: true,
        phone: true, email: true, fatherName: true, fatherPhone: true, motherName: true, motherPhone: true,
        guardianName: true, guardianRelation: true, guardianPhone: true, address: true, city: true, district: true, state: true, pincode: true,
        enrollments: {
          where: enrollmentFilter,
          orderBy: { academicYear: { startDate: "desc" } },
          take: 1,
          select: { rollNo: true, academicYear: { select: { name: true } }, class: { select: { name: true } }, section: { select: { name: true } } },
        },
      },
    }),
  ]);
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const workbook = await createSchoolReportWorkbook({
    schoolName: school.name,
    reportName: "Student Master Report",
    periodLabel: `Status: ${status.replaceAll("_", " ")}`,
    sheetName: "Students",
    rows: students,
    columns: [
      { header: "S.No", key: "serial", width: 8, value: (_row, index) => index + 1 },
      { header: "Admission No", key: "admissionNo", width: 16, value: (row) => row.admissionNo },
      { header: "Student Name", key: "fullName", width: 30, value: (row) => row.fullName },
      { header: "Gender", key: "gender", width: 12, value: (row) => row.gender },
      { header: "DOB", key: "dob", width: 14, value: (row) => row.dob, numFmt: "dd-mm-yyyy" },
      { header: "Academic Year", key: "academicYear", width: 16, value: (row) => row.enrollments[0]?.academicYear.name },
      { header: "Class", key: "class", width: 12, value: (row) => row.enrollments[0]?.class.name },
      { header: "Section", key: "section", width: 10, value: (row) => row.enrollments[0]?.section.name },
      { header: "Roll No", key: "rollNo", width: 10, value: (row) => row.enrollments[0]?.rollNo },
      { header: "Status", key: "status", width: 14, value: (row) => row.status },
      { header: "Joined Date", key: "joinedDate", width: 14, value: (row) => row.joinedDate, numFmt: "dd-mm-yyyy" },
      { header: "Student Phone", key: "phone", width: 16, value: (row) => row.phone },
      { header: "Student Email", key: "email", width: 26, value: (row) => row.email },
      { header: "Father Name", key: "fatherName", width: 26, value: (row) => row.fatherName },
      { header: "Father Phone", key: "fatherPhone", width: 16, value: (row) => row.fatherPhone },
      { header: "Mother Name", key: "motherName", width: 26, value: (row) => row.motherName },
      { header: "Mother Phone", key: "motherPhone", width: 16, value: (row) => row.motherPhone },
      { header: "Guardian Name", key: "guardianName", width: 26, value: (row) => row.guardianName },
      { header: "Guardian Relation", key: "guardianRelation", width: 18, value: (row) => row.guardianRelation },
      { header: "Guardian Phone", key: "guardianPhone", width: 16, value: (row) => row.guardianPhone },
      { header: "Address", key: "address", width: 34, value: (row) => row.address },
      { header: "City", key: "city", width: 18, value: (row) => row.city },
      { header: "District", key: "district", width: 18, value: (row) => row.district },
      { header: "State", key: "state", width: 18, value: (row) => row.state },
      { header: "Pincode", key: "pincode", width: 12, value: (row) => row.pincode },
    ],
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${safeReportFilename(school.name)}-student-master-report.xlsx"`,
    "Cache-Control": "no-store",
  } });
}

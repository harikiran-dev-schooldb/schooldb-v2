import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSchoolReportWorkbook, safeReportFilename } from "@/lib/reports/excel";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
  const search = request.nextUrl.searchParams.get("search")?.trim() || undefined;
  const activeParam = request.nextUrl.searchParams.get("active");
  const active = activeParam === "false" ? false : activeParam === "all" ? undefined : true;

  const [school, teachers] = await Promise.all([
    prisma.school.findFirst({ where: { id: tenant.schoolId, slug: schoolSlug }, select: { name: true } }),
    prisma.teacher.findMany({
      where: {
        schoolId: tenant.schoolId,
        ...(active === undefined ? {} : { active }),
        ...(search ? { OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { employeeId: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ] } : {}),
      },
      orderBy: { fullName: "asc" },
      select: {
        employeeId: true, fullName: true, gender: true, dob: true, joiningDate: true, phone: true,
        alternatePhone: true, email: true, qualification: true, designation: true, experience: true,
        bloodGroup: true, address: true, city: true, district: true, state: true, pincode: true, active: true,
        allocations: {
          where: { active: true },
          select: {
            academicYear: { select: { name: true } }, class: { select: { name: true } },
            section: { select: { name: true } }, subject: { select: { name: true } },
          },
          orderBy: [{ academicYear: { startDate: "desc" } }, { class: { name: "asc" } }],
        },
      },
    }),
  ]);
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  const workbook = await createSchoolReportWorkbook({
    schoolName: school.name,
    reportName: "Teacher Master Report",
    periodLabel: active === undefined ? "Status: All Teachers" : active ? "Status: Active" : "Status: Inactive",
    sheetName: "Teachers",
    rows: teachers,
    columns: [
      { header: "S.No", key: "serial", width: 8, value: (_row, index) => index + 1 },
      { header: "Employee ID", key: "employeeId", width: 16, value: (row) => row.employeeId },
      { header: "Teacher Name", key: "fullName", width: 30, value: (row) => row.fullName },
      { header: "Gender", key: "gender", width: 12, value: (row) => row.gender },
      { header: "DOB", key: "dob", width: 14, value: (row) => row.dob, numFmt: "dd-mm-yyyy" },
      { header: "Designation", key: "designation", width: 22, value: (row) => row.designation },
      { header: "Qualification", key: "qualification", width: 24, value: (row) => row.qualification },
      { header: "Experience (Years)", key: "experience", width: 18, value: (row) => row.experience },
      { header: "Joining Date", key: "joiningDate", width: 15, value: (row) => row.joiningDate, numFmt: "dd-mm-yyyy" },
      { header: "Phone", key: "phone", width: 16, value: (row) => row.phone },
      { header: "Alternate Phone", key: "alternatePhone", width: 16, value: (row) => row.alternatePhone },
      { header: "Email", key: "email", width: 28, value: (row) => row.email },
      { header: "Blood Group", key: "bloodGroup", width: 13, value: (row) => row.bloodGroup },
      { header: "Teaching Allocations", key: "allocations", width: 55, value: (row) => row.allocations.map((a) => `${a.academicYear.name}: ${a.class.name}-${a.section.name} / ${a.subject.name}`).join("; ") },
      { header: "Address", key: "address", width: 34, value: (row) => row.address },
      { header: "City", key: "city", width: 18, value: (row) => row.city },
      { header: "District", key: "district", width: 18, value: (row) => row.district },
      { header: "State", key: "state", width: 18, value: (row) => row.state },
      { header: "Pincode", key: "pincode", width: 12, value: (row) => row.pincode },
      { header: "Status", key: "active", width: 12, value: (row) => row.active ? "ACTIVE" : "INACTIVE" },
    ],
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${safeReportFilename(school.name)}-teacher-master-report.xlsx"`,
    "Cache-Control": "no-store",
  } });
}

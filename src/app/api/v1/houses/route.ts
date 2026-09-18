import { apiHandler } from "@/lib/api";
import { requireRole, requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"] as const;

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const houseId = searchParams.get("houseId") || undefined;
    const classId = searchParams.get("classId") || undefined;
    const sectionId = searchParams.get("sectionId") || undefined;

    const [houses, academicYears, classes, enrollments] = await Promise.all([
      prisma.house.findMany({
        where: { schoolId: tenant.schoolId },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { students: true } } },
      }),
      prisma.academicYear.findMany({
        where: { schoolId: tenant.schoolId },
        select: { id: true, name: true, active: true },
        orderBy: { startDate: "desc" },
      }),
      prisma.class.findMany({
        where: { schoolId: tenant.schoolId, active: true },
        select: { id: true, name: true, displayOrder: true, sections: { where: { active: true }, select: { id: true, name: true } } },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      }),
      academicYearId
        ? prisma.studentEnrollment.findMany({
            where: {
              schoolId: tenant.schoolId,
              academicYearId,
              active: true,
              ...(classId ? { classId } : {}),
              ...(sectionId ? { sectionId } : {}),
              ...(houseId ? { houseAssignment: { houseId } } : {}),
            },
            select: {
              id: true,
              rollNo: true,
              student: { select: { id: true, admissionNo: true, fullName: true, gender: true } },
              class: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } },
              houseAssignment: { select: { id: true, houseId: true, house: { select: { id: true, name: true, code: true, color: true } } } },
            },
            orderBy: [{ class: { displayOrder: "asc" } }, { section: { name: "asc" } }, { rollNo: "asc" }],
          })
        : Promise.resolve([]),
    ]);

    return ApiResponse.success({ houses, academicYears, classes, enrollments });
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([...ADMIN_ROLES]);
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const code = String(body.code ?? "").trim().toUpperCase() || null;
    const color = String(body.color ?? "").trim() || null;
    const description = String(body.description ?? "").trim() || null;
    const displayOrder = Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : 0;

    if (!name) return ApiResponse.error("House name is required.", 400);

    const house = await prisma.house.create({
      data: { schoolId: tenant.schoolId, name, code, color, description, displayOrder },
    });

    return ApiResponse.success(house, "House created successfully.", 201);
  });
}

export async function PUT(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([...ADMIN_ROLES]);
    const body = await req.json();
    const academicYearId = String(body.academicYearId ?? "");
    const houseId = String(body.houseId ?? "");
    const enrollmentIds = Array.isArray(body.enrollmentIds) ? body.enrollmentIds.map(String) : [];

    if (!academicYearId || !houseId || enrollmentIds.length === 0) {
      return ApiResponse.error("Academic year, house and students are required.", 400);
    }

    const [house, enrollments] = await Promise.all([
      prisma.house.findFirst({ where: { id: houseId, schoolId: tenant.schoolId, active: true }, select: { id: true } }),
      prisma.studentEnrollment.findMany({
        where: { id: { in: enrollmentIds }, schoolId: tenant.schoolId, academicYearId, active: true },
        select: { id: true, studentId: true },
      }),
    ]);

    if (!house) return ApiResponse.error("House not found.", 404);
    if (enrollments.length !== new Set(enrollmentIds).size) {
      return ApiResponse.error("One or more selected students are invalid for this academic year.", 400);
    }

    await prisma.$transaction(
      enrollments.map((enrollment) =>
        prisma.studentHouse.upsert({
          where: { studentEnrollmentId: enrollment.id },
          create: {
            schoolId: tenant.schoolId,
            academicYearId,
            studentId: enrollment.studentId,
            studentEnrollmentId: enrollment.id,
            houseId,
          },
          update: { houseId },
        }),
      ),
    );

    return ApiResponse.success({ updated: enrollments.length }, `${enrollments.length} student(s) allocated successfully.`);
  });
}

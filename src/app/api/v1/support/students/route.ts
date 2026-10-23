import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor } from "@/lib/support-tickets";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const actor = await supportActor();
    const searchParams = new URL(request.url).searchParams;
    const q = searchParams.get("q")?.trim().slice(0, 100) ?? "";
    const classId = searchParams.get("classId")?.trim() ?? "";
    const sectionId = searchParams.get("sectionId")?.trim() ?? "";
    const gender = (searchParams.get("gender") ?? "").toUpperCase();
    const isRteParam = searchParams.get("isRte") ?? "";
    const isRte = isRteParam === "true" ? true : isRteParam === "false" ? false : undefined;
    const activeAcademicYear = await prisma.academicYear.findFirst({
      where: { schoolId: actor.schoolId, active: true },
      select: { id: true, name: true },
    });
    if (!activeAcademicYear) {
      return ApiResponse.success({ students: [], classes: [], sections: [] });
    }

    const [classes, sections] = await Promise.all([
      prisma.class.findMany({
        where: {
          schoolId: actor.schoolId,
          active: true,
          enrollments: {
            some: { academicYearId: activeAcademicYear.id, active: true },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
      prisma.section.findMany({
        where: {
          active: true,
          class: { schoolId: actor.schoolId, active: true },
          enrollments: {
            some: { academicYearId: activeAcademicYear.id, active: true },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, classId: true },
      }),
    ]);

    if (q.length < 2 && !classId && !sectionId && !gender && isRte === undefined) {
      return ApiResponse.success({ students: [], classes, sections });
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId: actor.schoolId,
        status: "ACTIVE",
        ...(gender === "MALE" || gender === "FEMALE" || gender === "OTHER"
          ? { gender: gender as "MALE" | "FEMALE" | "OTHER" } : {}),
        ...(isRte !== undefined ? { isRte } : {}),
        ...(q.length >= 2 ? { OR: [
          { admissionNo: { contains: q, mode: "insensitive" as const } },
          { fullName: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q, mode: "insensitive" as const } },
          { alternatePhone: { contains: q, mode: "insensitive" as const } },
          { fatherPhone: { contains: q, mode: "insensitive" as const } },
          { motherPhone: { contains: q, mode: "insensitive" as const } },
          { guardianPhone: { contains: q, mode: "insensitive" as const } },
        ] } : {}),
        ...(classId || sectionId ? { enrollments: { some: {
          academicYearId: activeAcademicYear.id,
          active: true,
          ...(classId ? { classId } : {}),
          ...(sectionId ? { sectionId } : {}),
        } } } : {}),
      },
      select: {
        id: true, admissionNo: true, fullName: true,
        enrollments: {
          where: { academicYearId: activeAcademicYear.id, active: true },
          take: 1,
          select: {
            class: {
              select: {
                name: true,
                branch: {
                  select: {
                    name: true,
                    syllabus: { select: { name: true } },
                  },
                },
              },
            },
            section: { select: { name: true } },
          },
        },
      },
      take: 20,
      orderBy: { fullName: "asc" },
    });
    return ApiResponse.success({
      classes,
      sections,
      students: students.map((student) => ({
        id: student.id,
        admissionNo: student.admissionNo,
        fullName: student.fullName ?? "Student",
        academicYearName: activeAcademicYear.name,
        syllabusName: student.enrollments[0]?.class.branch.syllabus.name ?? null,
        branchName: student.enrollments[0]?.class.branch.name ?? null,
        className: student.enrollments[0]?.class.name ?? null,
        sectionName: student.enrollments[0]?.section.name ?? null,
      })),
    });
  });
}

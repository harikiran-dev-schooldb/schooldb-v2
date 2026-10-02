import { prisma } from "@/lib/prisma";
import type { ClassTeacherAssignmentInput } from "./schema";

async function validateRelations(
  schoolId: string,
  input: ClassTeacherAssignmentInput,
) {
  const [academicYear, teacher, schoolClass, section] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { id: input.academicYearId, schoolId },
      select: { id: true },
    }),
    prisma.teacher.findFirst({
      where: { id: input.teacherId, schoolId, active: true },
      select: { id: true },
    }),
    prisma.class.findFirst({
      where: { id: input.classId, schoolId, active: true },
      select: { id: true },
    }),
    prisma.section.findFirst({
      where: {
        id: input.sectionId,
        classId: input.classId,
        active: true,
        class: { schoolId },
      },
      select: { id: true },
    }),
  ]);

  if (!academicYear) throw new Error("Academic year not found.");
  if (!teacher) throw new Error("Choose an active teacher in this school.");
  if (!schoolClass) throw new Error("Class not found.");
  if (!section) {
    throw new Error("Selected section does not belong to the selected class.");
  }
}

const include = {
  academicYear: { select: { id: true, name: true } },
  teacher: { select: { id: true, fullName: true, employeeId: true } },
  class: { select: { id: true, name: true } },
  section: { select: { id: true, name: true } },
} as const;

export const classTeacherService = {
  async list(schoolId: string, search?: string) {
    return prisma.classTeacherAssignment.findMany({
      where: {
        schoolId,
        ...(search
          ? {
              OR: [
                { teacher: { fullName: { contains: search, mode: "insensitive" as const } } },
                { class: { name: { contains: search, mode: "insensitive" as const } } },
                { section: { name: { contains: search, mode: "insensitive" as const } } },
                { academicYear: { name: { contains: search, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      },
      include,
      orderBy: [
        { academicYear: { startDate: "desc" } },
        { class: { displayOrder: "asc" } },
        { section: { displayOrder: "asc" } },
      ],
    });
  },

  async get(id: string, schoolId: string) {
    const item = await prisma.classTeacherAssignment.findFirst({
      where: { id, schoolId },
      include,
    });
    if (!item) throw new Error("Class teacher assignment not found.");
    return item;
  },

  async create(schoolId: string, input: ClassTeacherAssignmentInput) {
    await validateRelations(schoolId, input);
    const existing = await prisma.classTeacherAssignment.findFirst({
      where: {
        schoolId,
        academicYearId: input.academicYearId,
        classId: input.classId,
        sectionId: input.sectionId,
      },
      select: { id: true },
    });
    if (existing) {
      throw new Error("This class and section already has a class teacher for the selected academic year.");
    }
    return prisma.classTeacherAssignment.create({
      data: {
        schoolId,
        ...input,
        remarks: input.remarks || null,
      },
      include,
    });
  },

  async update(
    id: string,
    schoolId: string,
    input: ClassTeacherAssignmentInput,
  ) {
    await this.get(id, schoolId);
    await validateRelations(schoolId, input);
    const duplicate = await prisma.classTeacherAssignment.findFirst({
      where: {
        schoolId,
        academicYearId: input.academicYearId,
        classId: input.classId,
        sectionId: input.sectionId,
        id: { not: id },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new Error("This class and section already has a class teacher for the selected academic year.");
    }
    return prisma.classTeacherAssignment.update({
      where: { id, schoolId },
      data: { ...input, remarks: input.remarks || null },
      include,
    });
  },
};

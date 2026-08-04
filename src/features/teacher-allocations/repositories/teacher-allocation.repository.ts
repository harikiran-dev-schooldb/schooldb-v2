import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const teacherAllocationRepository = {
  list(
    where: Prisma.TeacherAllocationWhereInput,
    options?: {
      skip?: number;
      take?: number;
    }
  ) {
    return prisma.teacherAllocation.findMany({
      where,

      include: {
        academicYear: true,
        teacher: true,
        subject: true,
        class: true,
        section: true,
      },

      skip: options?.skip,
      take: options?.take,

      orderBy: [
        {
          academicYear: {
            startDate: "desc",
          },
        },
        {
          class: {
            displayOrder: "asc",
          },
        },
        {
          section: {
            displayOrder: "asc",
          },
        },
        {
          subject: {
            displayOrder: "asc",
          },
        },
        {
          teacher: {
            fullName: "asc",
          },
        },
      ],
    });
  },

  count(where: Prisma.TeacherAllocationWhereInput) {
    return prisma.teacherAllocation.count({
      where,
    });
  },

  findById(
    id: string,
    schoolId: string
  ) {
    return prisma.teacherAllocation.findFirst({
      where: {
        id,
        schoolId,
      },

      include: {
        academicYear: true,
        teacher: true,
        subject: true,
        class: true,
        section: true,
      },
    });
  },

  findDuplicate(
    schoolId: string,
    academicYearId: string,
    teacherId: string,
    subjectId: string,
    classId: string,
    sectionId: string
  ) {
    return prisma.teacherAllocation.findFirst({
      where: {
        schoolId,
        academicYearId,
        teacherId,
        subjectId,
        classId,
        sectionId,
      },
    });
  },

  create(
    data: Prisma.TeacherAllocationCreateInput
  ) {
    return prisma.teacherAllocation.create({
      data,
    });
  },

  update(
    id: string,
    schoolId: string,
    data: Prisma.TeacherAllocationUpdateInput
  ) {
    return prisma.teacherAllocation.update({
      where: {
        id,
        schoolId,
      },

      data,
    });
  },

  options(schoolId: string) {
    return prisma.teacherAllocation.findMany({
      where: {
        schoolId,
        active: true,
      },

      include: {
        teacher: true,
        subject: true,
        class: true,
        section: true,
      },

      orderBy: [
        {
          teacher: {
            fullName: "asc",
          },
        },
      ],
    });
  },
};
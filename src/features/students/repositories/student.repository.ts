import {
  Prisma,
  StudentStatus,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export const studentRepository = {
  list(
    where: Prisma.StudentWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.StudentOrderByWithRelationInput;
    },
  ) {
    return prisma.student.findMany({
      where,
      include: {
        enrollments: {
          where: { active: true },
          select: {
            academicYear: { select: { name: true, startDate: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
          orderBy: { academicYear: { startDate: "desc" } },
          take: 1,
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy ?? { createdAt: "desc" },
    });
  },

  count(where: Prisma.StudentWhereInput) {
    return prisma.student.count({ where });
  },

  findByAdmissionNo(schoolId: string, admissionNo: string) {
    return prisma.student.findFirst({ where: { schoolId, admissionNo } });
  },

  findById(id: string, schoolId: string) {
    return prisma.student.findFirst({ where: { id, schoolId } });
  },

  findFirst(where: Prisma.StudentWhereInput) {
    return prisma.student.findFirst({ where });
  },

  create(data: Prisma.StudentCreateInput) {
    return prisma.student.create({ data });
  },

  update(
    id: string,
    schoolId: string,
    data: Prisma.StudentUpdateInput,
  ) {
    return prisma.student.update({ where: { id, schoolId }, data });
  },

  changeStatus(
    id: string,
    schoolId: string,
    status: StudentStatus,
    remarks?: string,
  ) {
    return prisma.student.update({
      where: { id, schoolId },
      data: {
        status,
        statusRemarks: remarks,
        statusChangedAt: new Date(),
      },
    });
  },

  options(schoolId: string, academicYearId: string) {
  return prisma.student.findMany({
    where: {
      schoolId,
      status: "ACTIVE",

      enrollments: {
        some: {
          academicYearId,
          active: true,
        },
      },
    },

    select: {
      id: true,
      admissionNo: true,
      fullName: true,

      enrollments: {
        where: {
          academicYearId,
          active: true,
        },

        select: {
          class: {
            select: {
              name: true,
            },
          },

          section: {
            select: {
              name: true,
            },
          },
        },

        take: 1,
      },
    },

    orderBy: {
      fullName: "asc",
    },
  });
},

  profile(id: string, schoolId: string) {
    return prisma.student.findFirst({
      where: { id, schoolId },
      include: {
        enrollments: {
          include: {
            academicYear: true,
            class: true,
            section: true,
          },
          orderBy: { academicYear: { startDate: "desc" } },
        },
      },
    });
  },
};
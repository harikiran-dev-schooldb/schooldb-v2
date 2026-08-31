import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type OutstandingFeesFilters = {
  schoolId: string;
  search?: string;
  classId?: string;
  academicYearId?: string;
};

const whereClause = ({
  schoolId,
  search,
  classId,
  academicYearId,
}: OutstandingFeesFilters): Prisma.StudentFeeInstallmentWhereInput => ({
  status: {
    in: ["PENDING", "PARTIAL"],
  },

  studentFeeItem: {
    studentFee: {
      schoolId,
      active: true,

      ...(academicYearId
        ? {
            feePlan: {
              academicYearId,
            },
          }
        : {}),

      studentEnrollment: {
        ...(classId
          ? {
              classId,
            }
          : {}),

        ...(search
          ? {
              student: {
                OR: [
                  {
                    fullName: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    admissionNo: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            }
          : {}),
      },
    },
  },
});

export const outstandingFeesRepository = {
  count(filters: OutstandingFeesFilters) {
    return prisma.studentFeeInstallment.count({
      where: whereClause(filters),
    });
  },

  aggregate(filters: OutstandingFeesFilters) {
    return prisma.studentFeeInstallment.aggregate({
      where: whereClause(filters),

      _sum: {
        payableAmount: true,
        concession: true,
        paidAmount: true,
      },
    });
  },

  list(
    filters: OutstandingFeesFilters,
    page: number,
    pageSize: number,
  ) {
    return prisma.studentFeeInstallment.findMany({
      where: whereClause(filters),

      orderBy: [
        {
          dueDate: "asc",
        },
        {
          id: "asc",
        },
      ],

      skip: (page - 1) * pageSize,
      take: pageSize,

      select: {
        id: true,
        name: true,
        amount: true,
        concession: true,
        payableAmount: true,
        paidAmount: true,
        dueDate: true,
        status: true,

        studentFeeItem: {
          select: {
            feeCategory: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },

            studentFee: {
              select: {
                id: true,

                studentEnrollment: {
                  select: {
                    id: true,
                    rollNo: true,

                    student: {
                      select: {
                        id: true,
                        admissionNo: true,
                        fullName: true,
                      },
                    },

                    class: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },

                    section: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },

                feePlan: {
                  select: {
                    id: true,
                    name: true,

                    academicYear: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },
};
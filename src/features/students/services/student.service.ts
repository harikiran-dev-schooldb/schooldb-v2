import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/current-tenant";

export const studentService = {
  async getAll() {
    const tenant = await getCurrentTenant();

    return prisma.student.findMany({
      where: {
        schoolId: tenant.schoolId,
        active: true,
      },

      select: {
        id: true,
        admissionNo: true,
        fullName: true,
        gender: true,
        phone: true,
        status: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getById(id: string) {
    const tenant = await getCurrentTenant();

    return prisma.student.findFirst({
      where: {
        id,
        schoolId: tenant.schoolId,
      },
    });
  },

  async count() {
    const tenant = await getCurrentTenant();

    return prisma.student.count({
      where: {
        schoolId: tenant.schoolId,
        active: true,
      },
    });
  },
};
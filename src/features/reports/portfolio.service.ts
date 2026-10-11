import { getAnalyticsSettings } from "@/features/reports/analytics-settings";
import { prisma } from "@/lib/prisma";

function percentage(numerator: number, denominator: number) {
  return denominator > 0
    ? Number(((numerator / denominator) * 100).toFixed(1))
    : 0;
}

export async function getSchoolPortfolio(
  userId: string,
  range: { from: string; to: string },
) {
  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T23:59:59.999`);
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      isActive: true,
      role: "SUPER_ADMIN",
    },
    select: {
      school: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { school: { name: "asc" } },
  });

  if (memberships.length < 2) return [];

  return Promise.all(
    memberships.map(async ({ school }) => {
      const [academicYear, students, attendanceGroups, collections, settings] =
        await Promise.all([
          prisma.academicYear.findFirst({
            where: { schoolId: school.id, active: true },
            orderBy: { startDate: "desc" },
            select: { id: true },
          }),
          prisma.student.count({
            where: { schoolId: school.id, status: "ACTIVE" },
          }),
          prisma.attendance.groupBy({
            by: ["status"],
            where: {
              schoolId: school.id,
              student: { status: "ACTIVE" },
              session: { attendanceDate: { gte: from, lte: to } },
            },
            _count: { _all: true },
          }),
          prisma.feePayment.aggregate({
            where: {
              schoolId: school.id,
              status: "SUCCESS",
              paymentDate: { gte: from, lte: to },
            },
            _sum: { amount: true },
          }),
          getAnalyticsSettings(school.id),
        ]);

      const feePosition = academicYear
        ? await prisma.studentFeeInstallment.aggregate({
            where: {
              studentFeeItem: {
                studentFee: {
                  schoolId: school.id,
                  active: true,
                  studentEnrollment: {
                    academicYearId: academicYear.id,
                    active: true,
                    student: { status: "ACTIVE" },
                  },
                },
              },
            },
            _sum: { payableAmount: true, paidAmount: true },
          })
        : null;

      const attendanceTotal = attendanceGroups.reduce(
        (sum, row) => sum + row._count._all,
        0,
      );
      const present = attendanceGroups.find((row) => row.status === "PRESENT")?._count._all ?? 0;
      const late = attendanceGroups.find((row) => row.status === "LATE")?._count._all ?? 0;
      const payable = Number(feePosition?._sum.payableAmount ?? 0);
      const paid = Number(feePosition?._sum.paidAmount ?? 0);

      return {
        ...school,
        students,
        attendancePercentage: percentage(
          present + (settings.lateCountsAsPresent ? late : 0),
          attendanceTotal,
        ),
        collected: Number(collections._sum.amount ?? 0),
        outstanding: Math.max(0, payable - paid),
        collectionEfficiency: percentage(paid, payable),
      };
    }),
  );
}

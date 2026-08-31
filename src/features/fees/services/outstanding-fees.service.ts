import { outstandingFeesRepository } from "../repositories/outstanding-fees.repository";


type OutstandingFeesInput = {
  schoolId: string;
  search?: string;
  classId?: string;
  academicYearId?: string;
  page: number;
  pageSize: number;
};

export const outstandingFeesService = {
  async list(input: OutstandingFeesInput) {
    const {
      schoolId,
      search,
      classId,
      academicYearId,
      page,
      pageSize,
    } = input;

    const filters = {
      schoolId,
      search,
      classId,
      academicYearId,
    };

    const [rows, total, aggregate] =
      await Promise.all([
        outstandingFeesRepository.list(
          filters,
          page,
          pageSize,
        ),

        outstandingFeesRepository.count(
          filters,
        ),

        outstandingFeesRepository.aggregate(
          filters,
        ),
      ]);

    const mappedRows = rows.map(
      (installment) => {
        const amount =
          Number(installment.amount);

        const concession =
          Number(installment.concession);

        const payableAmount =
          Number(
            installment.payableAmount,
          );

        const paidAmount =
          Number(installment.paidAmount);

        const outstanding =
          Math.max(
            0,
            payableAmount - paidAmount,
          );

        const enrollment =
          installment.studentFeeItem
            .studentFee.studentEnrollment;

        return {
          id: installment.id,

          installmentName:
            installment.name,

          dueDate:
            installment.dueDate,

          status:
            installment.status,

          amount,
          concession,
          payableAmount,
          paidAmount,
          outstanding,

          feeCategory:
            installment.studentFeeItem
              .feeCategory,

          student: {
            id: enrollment.student.id,
            admissionNo:
              enrollment.student.admissionNo,
            fullName:
              enrollment.student.fullName,
          },

          class: enrollment.class,

          section:
            enrollment.section,

          rollNo:
            enrollment.rollNo,

          studentFeeId:
            installment.studentFeeItem
              .studentFee.id,

          studentEnrollmentId:
            enrollment.id,

          feePlan:
            installment.studentFeeItem
              .studentFee.feePlan,
        };
      },
    );

    const totalPayable =
      Number(
        aggregate._sum.payableAmount ?? 0,
      );

    const totalConcession =
      Number(
        aggregate._sum.concession ?? 0,
      );

    const totalPaid =
      Number(
        aggregate._sum.paidAmount ?? 0,
      );

    const outstanding =
      Math.max(
        0,
        totalPayable - totalPaid,
      );

    return {
      rows: mappedRows,

      summary: {
        installmentCount: total,
        totalPayable,
        totalConcession,
        totalPaid,
        outstanding,
      },

      pagination: {
        page,
        pageSize,
        total,
        totalPages:
          Math.ceil(total / pageSize),
      },
    };
  },
};
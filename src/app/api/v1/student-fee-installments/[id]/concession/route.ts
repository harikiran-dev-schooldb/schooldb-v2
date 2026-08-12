import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const concessionSchema = z.object({
  concession: z.coerce.number().min(0),
});

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  req: Request,
  { params }: Params,
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const body = await req.json();

    const { concession } =
      concessionSchema.parse(body);

    const installment =
      await prisma.studentFeeInstallment.findFirst({
        where: {
          id,
          studentFeeItem: {
            studentFee: {
              schoolId: tenant.schoolId,
            },
          },
        },
      });

    if (!installment) {
      return ApiResponse.error(
        "Student fee installment not found.",
        404,
      );
    }

    const amount = Number(installment.amount);
    const paidAmount = Number(installment.paidAmount);

    if (concession > amount) {
      throw new Error(
        "Concession cannot be greater than the installment amount.",
      );
    }

    const payableAmount =
      amount - concession;

    if (paidAmount > payableAmount) {
      throw new Error(
        "Concession cannot make the payable amount less than the amount already paid.",
      );
    }

    let status:
      | "PENDING"
      | "PARTIAL"
      | "PAID"
      | "WAIVED";

    if (payableAmount === 0) {
      status = "WAIVED";
    } else if (paidAmount >= payableAmount) {
      status = "PAID";
    } else if (paidAmount > 0) {
      status = "PARTIAL";
    } else {
      status = "PENDING";
    }

    const updated =
      await prisma.studentFeeInstallment.update({
        where: {
          id,
        },

        data: {
          concession,
          payableAmount,
          status,
        },
      });

    return ApiResponse.success(
      updated,
      "Concession updated successfully.",
    );
  });
}
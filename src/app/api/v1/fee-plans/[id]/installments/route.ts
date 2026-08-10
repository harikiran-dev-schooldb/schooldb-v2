import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  req: Request,
  { params }: Props,
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const plan = await prisma.feePlan.findFirst({
      where: {
        id,
        schoolId: tenant.schoolId,
      },
    });

    if (!plan) {
      throw new Error("Fee plan not found.");
    }

    const installments =
      await prisma.feeInstallment.findMany({
        where: {
          feePlanItem: {
            feePlanId: id,
          },
        },
        include: {
          feePlanItem: {
            include: {
              feeCategory: true,
            },
          },
          academicPeriod: true,
        },
        orderBy: [
          {
            feePlanItem: {
              feeCategory: {
                name: "asc",
              },
            },
          },
          {
            sequence: "asc",
          },
        ],
      });

    return ApiResponse.success(
      installments,
    );
  });
}
import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createAcademicPeriodSchema = z.object({
  academicYearId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  shortName: z.string().trim().max(30).optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  sequence: z.number().int().positive(),
});

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const periods = await prisma.academicPeriod.findMany({
      where: {
        schoolId: tenant.schoolId,
      },
      orderBy: {
        sequence: "asc",
      },
    });

    return ApiResponse.success(periods);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const body = await req.json();

    const input =
      createAcademicPeriodSchema.parse(body);

    const academicYear =
      await prisma.academicYear.findFirst({
        where: {
          id: input.academicYearId,
          schoolId: tenant.schoolId,
        },
      });

    if (!academicYear) {
      throw new Error(
        "Academic year not found.",
      );
    }

    const startDate = new Date(
  `${input.startDate}T00:00:00.000Z`,
);

const endDate = new Date(
  `${input.endDate}T00:00:00.000Z`,
);

if (
  Number.isNaN(startDate.getTime()) ||
  Number.isNaN(endDate.getTime())
) {
  throw new Error(
    "Invalid academic period dates.",
  );
}

if (endDate < startDate) {
  throw new Error(
    "End date cannot be before start date.",
  );
}

if (
  startDate < academicYear.startDate ||
  endDate > academicYear.endDate
) {
  throw new Error(
    `Academic period must be within the academic year ${academicYear.name} (${academicYear.startDate.toISOString().slice(0, 10)} to ${academicYear.endDate.toISOString().slice(0, 10)}).`,
  );
}

    const existing =
      await prisma.academicPeriod.findFirst({
        where: {
          academicYearId:
            input.academicYearId,
          OR: [
            {
              name: input.name,
            },
            {
              sequence: input.sequence,
            },
          ],
        },
      });

    if (existing) {
      throw new Error(
        "Academic period name or sequence already exists.",
      );
    }

    const period =
      await prisma.academicPeriod.create({
        data: {
          schoolId: tenant.schoolId,
          academicYearId:
            input.academicYearId,

          name: input.name,

          shortName:
            input.shortName || null,

          startDate,
          endDate,

          sequence:
            input.sequence,
        },
      });

    return ApiResponse.success(
      period,
      "Academic period created successfully.",
      201,
    );
  });
}
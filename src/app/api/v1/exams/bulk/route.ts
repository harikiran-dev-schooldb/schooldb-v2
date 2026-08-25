import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { createExamSchema } from "@/features/exams/schemas/exam.schema";

const MAX_ROWS = 500;

type ImportRow = {
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
};

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const body = (await request.json()) as { exams?: unknown };
    const exams = Array.isArray(body.exams) ? body.exams : [];

    if (!exams.length) throw new Error("No exams were provided.");
    if (exams.length > MAX_ROWS) throw new Error(`Maximum ${MAX_ROWS} exams per import.`);

    const validated: ImportRow[] = exams.map((item, index) => {
      const parsed = createExamSchema.safeParse(item);
      if (!parsed.success) {
        throw new Error(`Row ${index + 2}: ${parsed.error.issues[0]?.message ?? "Invalid exam."}`);
      }
      return parsed.data;
    });

    const academicYearIds = [...new Set(validated.map((item) => item.academicYearId))];
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId: tenant.schoolId, id: { in: academicYearIds } },
      select: { id: true },
    });
    const validYears = new Set(academicYears.map((year) => year.id));

    for (let i = 0; i < validated.length; i += 1) {
      if (!validYears.has(validated[i].academicYearId)) {
        throw new Error(`Row ${i + 2}: Academic year not found.`);
      }
    }

    const seen = new Set<string>();
    for (let i = 0; i < validated.length; i += 1) {
      const key = `${validated[i].academicYearId}:${validated[i].name.trim().toLowerCase()}`;
      if (seen.has(key)) throw new Error(`Duplicate exam in import at row ${i + 2}: ${validated[i].name}`);
      seen.add(key);
    }

    const existing = await prisma.exam.findMany({
      where: {
        schoolId: tenant.schoolId,
        OR: academicYearIds.map((academicYearId) => ({
          academicYearId,
          name: { in: validated.filter((item) => item.academicYearId === academicYearId).map((item) => item.name.trim()) },
        })),
      },
      select: { academicYearId: true, name: true },
    });

    if (existing.length) {
      throw new Error(`Exam already exists: ${existing[0].name}`);
    }

    await prisma.$transaction(
      validated.map((item) =>
        prisma.exam.create({
          data: {
            schoolId: tenant.schoolId,
            academicYearId: item.academicYearId,
            name: item.name.trim(),
            startDate: new Date(item.startDate),
            endDate: new Date(item.endDate),
          },
        }),
      ),
    );

    return ApiResponse.success(
      { created: validated.length, failed: 0, errors: [] },
      "Exams imported successfully.",
    );
  });
}

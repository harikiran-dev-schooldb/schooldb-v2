import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { subjectSchema } from "@/features/subjects/schemas/subject.schema";

const MAX_ROWS = 500;

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await req.json()) as { subjects?: unknown };
    const subjects = Array.isArray(body.subjects) ? body.subjects : [];
    if (!subjects.length) throw new Error("No subjects were provided.");
    if (subjects.length > MAX_ROWS)
      throw new Error(`Maximum ${MAX_ROWS} subjects per import.`);
    const validated = subjects.map((item, index) => {
      const result = subjectSchema.safeParse(item);
      if (!result.success)
        throw new Error(
          `Row ${index + 2}: ${result.error.issues[0]?.message ?? "Invalid subject."}`,
        );
      return result.data;
    });
    const names = new Set<string>();
    for (let i = 0; i < validated.length; i += 1) {
      const key = validated[i].name.trim().toLowerCase();
      if (names.has(key))
        throw new Error(
          `Duplicate subject name in import at row ${i + 2}: ${validated[i].name}`,
        );
      names.add(key);
    }
    const existing = await prisma.subject.findMany({
      where: {
        schoolId: tenant.schoolId,
        name: { in: validated.map((item) => item.name) },
      },
      select: { name: true },
    });
    if (existing.length)
      throw new Error(`Subject already exists: ${existing[0].name}`);
    await prisma.$transaction(
      validated.map((item) =>
        prisma.subject.create({
          data: {
            name: item.name.trim(),
            code: item.code === "" ? null : item.code,
            type: item.type,
            displayOrder: item.displayOrder,
            active: item.active,
            school: { connect: { id: tenant.schoolId } },
          },
        }),
      ),
    );
    return ApiResponse.success(
      { created: validated.length, failed: 0, errors: [] },
      "Subjects imported successfully.",
    );
  });
}

import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const rowSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().optional().default(""),
  sectionName: z.string().trim().min(1),
  displayOrder: z.coerce.number().int().min(0).default(0),
  sectionDisplayOrder: z.coerce.number().int().min(0).default(0),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
});

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = bodySchema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      let classesCreated = 0;
      let sectionsCreated = 0;
      let skipped = 0;
      const errors: Array<{ row: number; message: string }> = [];

      const seen = new Set<string>();

      for (const [index, row] of body.rows.entries()) {
        const rowNumber = index + 2;
        const key = `${row.name.toLowerCase()}::${row.sectionName.toLowerCase()}`;

        if (seen.has(key)) {
          skipped += 1;
          continue;
        }
        seen.add(key);

        try {
          let schoolClass = await tx.class.findFirst({
            where: { schoolId: tenant.schoolId, name: row.name },
          });

          if (!schoolClass) {
            schoolClass = await tx.class.create({
              data: {
                schoolId: tenant.schoolId,
                name: row.name,
                code: row.code || null,
                displayOrder: row.displayOrder,
                active: true,
              },
            });
            classesCreated += 1;
          }

          const section = await tx.section.findFirst({
            where: { classId: schoolClass.id, name: row.sectionName },
          });

          if (section) {
            skipped += 1;
            continue;
          }

          await tx.section.create({
            data: {
              classId: schoolClass.id,
              name: row.sectionName,
              displayOrder: row.sectionDisplayOrder,
              active: true,
            },
          });
          sectionsCreated += 1;
        } catch (error) {
          errors.push({
            row: rowNumber,
            message:
              error instanceof Error ? error.message : "Unable to import row.",
          });
        }
      }

      return { classesCreated, sectionsCreated, skipped, errors };
    });

    return ApiResponse.success(
      result,
      "Bulk class and section import completed.",
    );
  });
}

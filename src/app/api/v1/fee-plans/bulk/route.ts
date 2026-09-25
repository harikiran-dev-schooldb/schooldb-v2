import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

const frequencySchema = z.enum([
  "MONTHLY",
  "QUARTERLY",
  "TERMLY",
  "HALF_YEARLY",
  "ANNUAL",
  "CUSTOM",
]);

const rowSchema = z.object({
  academicYear: z.string().trim().min(1).max(100),
  planName: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional().default(""),
  classes: z.string().trim().min(1).max(1000),
  feeItems: z.string().trim().min(1).max(5000),
});

const bodySchema = z.object({
  plans: z.array(rowSchema).min(1).max(500),
});

const normalize = (value: string) => value.trim().toLowerCase();

function parseMandatory(value: string) {
  const normalized = normalize(value);
  if (["true", "yes"].includes(normalized)) return true;
  if (["false", "no"].includes(normalized)) return false;
  throw new Error("Mandatory must be true/false or yes/no.");
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"]);
    const { plans } = await validateBody(request, bodySchema);
    const schoolId = membership.schoolId;

    const [academicYears, schoolClasses, feeCategories, existingPlans] = await Promise.all([
      prisma.academicYear.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
      prisma.class.findMany({
        where: { schoolId, active: true },
        select: { id: true, name: true, code: true },
      }),
      prisma.feeCategory.findMany({
        where: { schoolId, active: true },
        select: { id: true, name: true, code: true },
      }),
      prisma.feePlan.findMany({
        where: { schoolId },
        select: { academicYearId: true, name: true },
      }),
    ]);

    const yearByName = new Map(academicYears.map((year) => [normalize(year.name), year]));
    const classByName = new Map<string, (typeof schoolClasses)[number]>();
    schoolClasses.forEach((item) => {
      classByName.set(normalize(item.name), item);
      if (item.code) classByName.set(normalize(item.code), item);
    });
    const categoryByName = new Map<string, (typeof feeCategories)[number]>();
    feeCategories.forEach((item) => {
      categoryByName.set(normalize(item.name), item);
      if (item.code) categoryByName.set(normalize(item.code), item);
    });
    const occupied = new Set(existingPlans.map((plan) => `${plan.academicYearId}:${normalize(plan.name)}`));

    let created = 0;
    let failed = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (const [index, row] of plans.entries()) {
      const rowNumber = index + 2;
      try {
        const academicYear = yearByName.get(normalize(row.academicYear));
        if (!academicYear) throw new Error(`Academic year not found: ${row.academicYear}.`);

        const planKey = `${academicYear.id}:${normalize(row.planName)}`;
        if (occupied.has(planKey)) {
          throw new Error(`Fee plan already exists for ${row.academicYear}: ${row.planName}.`);
        }

        const appliesToAllClasses = normalize(row.classes) === "all";
        const classIds = appliesToAllClasses ? [] : Array.from(new Set(
          row.classes.split("|").map((name) => {
            const schoolClass = classByName.get(normalize(name));
            if (!schoolClass) throw new Error(`Class not found: ${name.trim()}.`);
            return schoolClass.id;
          }),
        ));
        if (!appliesToAllClasses && classIds.length === 0) {
          throw new Error("Enter ALL or at least one valid class.");
        }

        const seenCategories = new Set<string>();
        const items = row.feeItems.split(";").map((entry) => {
          const parts = entry.split("|").map((value) => value.trim());
          if (parts.length !== 4) {
            throw new Error("Each fee item must use category|frequency|amount|mandatory.");
          }
          const [categoryName, frequencyValue, amountValue, mandatoryValue] = parts;
          const category = categoryByName.get(normalize(categoryName));
          if (!category) throw new Error(`Active fee category not found: ${categoryName}.`);
          if (seenCategories.has(category.id)) throw new Error(`Fee category is repeated: ${categoryName}.`);
          seenCategories.add(category.id);

          const frequency = frequencySchema.parse(frequencyValue.toUpperCase());
          const amount = Number(amountValue);
          if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error(`Enter a positive amount for ${categoryName}.`);
          }
          return {
            feeCategoryId: category.id,
            frequency,
            amount,
            mandatory: parseMandatory(mandatoryValue),
          };
        });
        if (!items.length) throw new Error("Add at least one fee item.");

        await prisma.feePlan.create({
          data: {
            schoolId,
            academicYearId: academicYear.id,
            name: row.planName,
            description: row.description || null,
            appliesToAllClasses,
            active: true,
            classes: appliesToAllClasses
              ? undefined
              : { create: classIds.map((classId) => ({ classId })) },
            items: { create: items },
          },
          select: { id: true },
        });
        occupied.add(planKey);
        created += 1;
      } catch (error) {
        failed += 1;
        errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : "Unable to create fee plan.",
        });
      }
    }

    return ApiResponse.success({ created, failed, errors }, "Bulk fee plan import completed.");
  });
}

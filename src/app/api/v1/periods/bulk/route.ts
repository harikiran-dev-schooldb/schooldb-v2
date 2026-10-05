import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

const rowSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    startTime: z.string().trim().regex(TIME_PATTERN),
    endTime: z.string().trim().regex(TIME_PATTERN),
    displayOrder: z.coerce.number().int().min(1),
    active: z
      .union([z.boolean(), z.string()])
      .transform((value, context) => {
        if (typeof value === "boolean") return value;
        const normalized = value.trim().toLowerCase();
        if (["true", "yes", "1", ""].includes(normalized)) return true;
        if (["false", "no", "0"].includes(normalized)) return false;
        context.addIssue({
          code: "custom",
          message: "Active must be TRUE, FALSE, YES, NO, 1 or 0.",
        });
        return z.NEVER;
      }),
  })
  .refine((row) => toMinutes(row.endTime) > toMinutes(row.startTime), {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

const bodySchema = z.object({
  periods: z.array(z.unknown()).min(1).max(500),
});

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = bodySchema.parse(await request.json());
    const rows = body.periods.map((value, index) => {
      const parsed = rowSchema.safeParse(value);
      if (!parsed.success) {
        throw new Error(
          `Row ${index + 2}: ${parsed.error.issues[0]?.message ?? "Invalid period."}`,
        );
      }
      return { ...parsed.data, rowNumber: index + 2 };
    });

    const seenNames = new Set<string>();
    for (const row of rows) {
      const key = normalize(row.name);
      if (seenNames.has(key)) {
        throw new Error(
          `Row ${row.rowNumber}: Duplicate period name in this file: ${row.name}.`,
        );
      }
      seenNames.add(key);
    }

    const existing = await prisma.period.findMany({
      where: { schoolId: tenant.schoolId },
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        displayOrder: true,
        active: true,
      },
    });
    const existingByName = new Map(
      existing.map((period) => [normalize(period.name), period]),
    );
    const updatesByName = new Map(rows.map((row) => [normalize(row.name), row]));
    const finalPeriods: Array<{
      id?: string;
      name: string;
      startTime: string;
      endTime: string;
      displayOrder: number;
      active: boolean;
      rowNumber?: number;
    }> = existing.map((period) => {
      const update = updatesByName.get(normalize(period.name));
      return update ? { ...period, ...update } : period;
    });

    for (const row of rows) {
      if (!existingByName.has(normalize(row.name))) finalPeriods.push(row);
    }

    const orderOwners = new Map<number, string>();
    for (const period of finalPeriods) {
      const owner = orderOwners.get(period.displayOrder);
      if (owner) {
        throw new Error(
          `Display order ${period.displayOrder} is used by both ${owner} and ${period.name}.`,
        );
      }
      orderOwners.set(period.displayOrder, period.name);
    }

    const chronological = [...finalPeriods].sort(
      (left, right) => toMinutes(left.startTime) - toMinutes(right.startTime),
    );
    for (let index = 1; index < chronological.length; index += 1) {
      const previous = chronological[index - 1];
      const current = chronological[index];
      if (toMinutes(current.startTime) < toMinutes(previous.endTime)) {
        throw new Error(
          `${current.name} (${current.startTime}-${current.endTime}) overlaps ${previous.name} (${previous.startTime}-${previous.endTime}).`,
        );
      }
    }

    let created = 0;
    let updated = 0;
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const current = existingByName.get(normalize(row.name));
        const data = {
          name: row.name,
          startTime: row.startTime,
          endTime: row.endTime,
          displayOrder: row.displayOrder,
          active: row.active,
        };

        if (current) {
          await tx.period.update({ where: { id: current.id }, data });
          updated += 1;
        } else {
          await tx.period.create({
            data: { ...data, schoolId: tenant.schoolId },
          });
          created += 1;
        }
      }
    });

    return ApiResponse.success(
      { created, updated, failed: 0, errors: [] },
      "School periods created and updated successfully.",
    );
  });
}

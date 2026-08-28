import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { ClassSubjectRow } from "../types";

export type BulkClassSubjectRow = {
  className: string;
  subjectName: string;
  active?: boolean;
};

export const classSubjectService = {
  async list(
    schoolId: string,
    academicYearId?: string,
    classId?: string,
  ) {
    return prisma.$queryRaw<ClassSubjectRow[]>(Prisma.sql`
      SELECT
        cs."id",
        cs."academicYearId",
        ay."name" AS "academicYearName",
        cs."classId",
        c."name" AS "className",
        cs."subjectId",
        s."name" AS "subjectName",
        s."code" AS "subjectCode",
        s."type" AS "subjectType",
        cs."active"
      FROM "ClassSubject" cs
      INNER JOIN "AcademicYear" ay ON ay."id" = cs."academicYearId"
      INNER JOIN "Class" c ON c."id" = cs."classId"
      INNER JOIN "Subject" s ON s."id" = cs."subjectId"
      WHERE cs."schoolId" = ${schoolId}
        ${academicYearId ? Prisma.sql`AND cs."academicYearId" = ${academicYearId}` : Prisma.empty}
        ${classId ? Prisma.sql`AND cs."classId" = ${classId}` : Prisma.empty}
      ORDER BY c."displayOrder" ASC, c."name" ASC, s."displayOrder" ASC, s."name" ASC
    `);
  },

  async create(
    schoolId: string,
    academicYearId: string,
    classId: string,
    subjectId: string,
  ) {
    const [academicYear, cls, subject] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { id: academicYearId, schoolId },
        select: { id: true },
      }),
      prisma.class.findFirst({
        where: { id: classId, schoolId, active: true },
        select: { id: true },
      }),
      prisma.subject.findFirst({
        where: { id: subjectId, schoolId, active: true },
        select: { id: true },
      }),
    ]);

    if (!academicYear) throw new Error("Academic year not found.");
    if (!cls) throw new Error("Class not found.");
    if (!subject) throw new Error("Subject not found.");

    const existing = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT "id"
      FROM "ClassSubject"
      WHERE "academicYearId" = ${academicYearId}
        AND "classId" = ${classId}
        AND "subjectId" = ${subjectId}
      LIMIT 1
    `);

    if (existing.length > 0) {
      throw new Error("This subject is already assigned to the class.");
    }

    const id = `cs_${crypto.randomUUID().replaceAll("-", "")}`;

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "ClassSubject" (
        "id", "schoolId", "academicYearId", "classId", "subjectId",
        "active", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${schoolId}, ${academicYearId}, ${classId}, ${subjectId},
        true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `);

    return { id };
  },

  async bulkCreate(
    schoolId: string,
    academicYearId: string,
    rows: BulkClassSubjectRow[],
  ) {
    if (rows.length === 0) {
      throw new Error("No class subject rows were provided.");
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true },
    });

    if (!academicYear) {
      throw new Error("Academic year not found.");
    }

    const normalized = rows.map((row, index) => ({
      rowNumber: index + 2,
      className: row.className.trim(),
      subjectName: row.subjectName.trim(),
      active: row.active ?? true,
    }));

    const invalid = normalized.filter(
      (row) => !row.className || !row.subjectName,
    );

    if (invalid.length > 0) {
      throw new Error(
        `Rows ${invalid.map((row) => row.rowNumber).join(", ")} require Class and Subject.`,
      );
    }

    const [classes, subjects] = await Promise.all([
      prisma.class.findMany({
        where: { schoolId, active: true },
        select: { id: true, name: true },
      }),
      prisma.subject.findMany({
        where: { schoolId, active: true },
        select: { id: true, name: true },
      }),
    ]);

    const classMap = new Map(classes.map((item) => [item.name.toLowerCase(), item]));
    const subjectMap = new Map(subjects.map((item) => [item.name.toLowerCase(), item]));
    const seen = new Set<string>();
    const errors: string[] = [];
    const prepared: Array<{
      rowNumber: number;
      classId: string;
      subjectId: string;
      active: boolean;
    }> = [];

    for (const row of normalized) {
      const cls = classMap.get(row.className.toLowerCase());
      const subject = subjectMap.get(row.subjectName.toLowerCase());

      if (!cls) {
        errors.push(`Row ${row.rowNumber}: Class "${row.className}" not found.`);
        continue;
      }

      if (!subject) {
        errors.push(`Row ${row.rowNumber}: Subject "${row.subjectName}" not found.`);
        continue;
      }

      const key = `${cls.id}:${subject.id}`;
      if (seen.has(key)) {
        errors.push(`Row ${row.rowNumber}: Duplicate class/subject assignment in file.`);
        continue;
      }

      seen.add(key);
      prepared.push({
        rowNumber: row.rowNumber,
        classId: cls.id,
        subjectId: subject.id,
        active: row.active,
      });
    }

    if (errors.length > 0) {
      throw new Error(errors.join(" "));
    }

    const existing = await prisma.$queryRaw<
      { classId: string; subjectId: string }[]
    >(Prisma.sql`
      SELECT "classId", "subjectId"
      FROM "ClassSubject"
      WHERE "schoolId" = ${schoolId}
        AND "academicYearId" = ${academicYearId}
    `);

    const existingKeys = new Set(
      existing.map((item) => `${item.classId}:${item.subjectId}`),
    );

    const toCreate = prepared.filter(
      (row) => !existingKeys.has(`${row.classId}:${row.subjectId}`),
    );

    if (toCreate.length === 0) {
      return { imported: 0, skipped: prepared.length };
    }

    await prisma.$transaction(
      toCreate.map((row) =>
        prisma.$executeRaw(Prisma.sql`
          INSERT INTO "ClassSubject" (
            "id", "schoolId", "academicYearId", "classId", "subjectId",
            "active", "createdAt", "updatedAt"
          ) VALUES (
            ${`cs_${crypto.randomUUID().replaceAll("-", "")}`},
            ${schoolId},
            ${academicYearId},
            ${row.classId},
            ${row.subjectId},
            ${row.active},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `),
      ),
    );

    return {
      imported: toCreate.length,
      skipped: prepared.length - toCreate.length,
    };
  },

  async remove(id: string, schoolId: string) {
    const result = await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "ClassSubject"
      WHERE "id" = ${id} AND "schoolId" = ${schoolId}
    `);

    if (result === 0) {
      throw new Error("Class subject assignment not found.");
    }
  },
};

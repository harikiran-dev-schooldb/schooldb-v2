import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { BulkClassSubjectRow, ClassSubjectRow } from "../types";



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
  rows: BulkClassSubjectRow[],
) {
  if (rows.length === 0) {
    throw new Error("No class subject rows were provided.");
  }

  const normalized = rows.map((row, index) => ({
    rowNumber: index + 2,
    academicYear: row.academicYear.trim(),
    className: row.className.trim(),
    subject: row.subject.trim(),
    active: row.active ?? true,
  }));

  const errors: Array<{
    row: number;
    message: string;
  }> = [];

  // ---------------------------------------------------------
  // 1. Validate required values
  // ---------------------------------------------------------

  for (const row of normalized) {
    if (!row.academicYear) {
      errors.push({
        row: row.rowNumber,
        message: "Academic year is required.",
      });
    }

    if (!row.className) {
      errors.push({
        row: row.rowNumber,
        message: "Class is required.",
      });
    }

    if (!row.subject) {
      errors.push({
        row: row.rowNumber,
        message: "Subject is required.",
      });
    }
  }

  if (errors.length > 0) {
    return {
      created: 0,
      skipped: 0,
      errors,
    };
  }

  // ---------------------------------------------------------
  // 2. Load all required master data
  // ---------------------------------------------------------

  const academicYears = await prisma.academicYear.findMany({
    where: {
      schoolId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const classes = await prisma.class.findMany({
    where: {
      schoolId,
      active: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const subjects = await prisma.subject.findMany({
    where: {
      schoolId,
      active: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  // ---------------------------------------------------------
  // 3. Create lookup maps
  // ---------------------------------------------------------

  const academicYearMap = new Map(
    academicYears.map((item) => [
      item.name.trim().toLowerCase(),
      item,
    ]),
  );

  const classMap = new Map(
    classes.map((item) => [
      item.name.trim().toLowerCase(),
      item,
    ]),
  );

  const subjectMap = new Map(
    subjects.map((item) => [
      item.name.trim().toLowerCase(),
      item,
    ]),
  );

  // ---------------------------------------------------------
  // 4. Resolve CSV names to database IDs
  // ---------------------------------------------------------

  const prepared: Array<{
    rowNumber: number;
    academicYearId: string;
    classId: string;
    subjectId: string;
    active: boolean;
  }> = [];

  const fileKeys = new Set<string>();

  for (const row of normalized) {
    const academicYear = academicYearMap.get(
      row.academicYear.toLowerCase(),
    );

    if (!academicYear) {
      errors.push({
        row: row.rowNumber,
        message: `Academic year "${row.academicYear}" not found.`,
      });
      continue;
    }

    const cls = classMap.get(row.className.toLowerCase());

    if (!cls) {
      errors.push({
        row: row.rowNumber,
        message: `Class "${row.className}" not found.`,
      });
      continue;
    }

    const subject = subjectMap.get(row.subject.toLowerCase());

    if (!subject) {
      errors.push({
        row: row.rowNumber,
        message: `Subject "${row.subject}" not found.`,
      });
      continue;
    }

    // Academic Year + Class + Subject
    const key = [
      academicYear.id,
      cls.id,
      subject.id,
    ].join(":");

    if (fileKeys.has(key)) {
      errors.push({
        row: row.rowNumber,
        message:
          "Duplicate class-subject mapping in this file.",
      });
      continue;
    }

    fileKeys.add(key);

    prepared.push({
      rowNumber: row.rowNumber,
      academicYearId: academicYear.id,
      classId: cls.id,
      subjectId: subject.id,
      active: row.active,
    });
  }

  // ---------------------------------------------------------
  // 5. If there are validation errors, do NOT import anything
  // ---------------------------------------------------------

  if (errors.length > 0) {
    return {
      created: 0,
      skipped: 0,
      errors,
    };
  }

  // ---------------------------------------------------------
  // 6. Find existing mappings
  // ---------------------------------------------------------

  const academicYearIds = [
    ...new Set(prepared.map((row) => row.academicYearId)),
  ];

  const existing = await prisma.$queryRaw<
    {
      academicYearId: string;
      classId: string;
      subjectId: string;
    }[]
  >(Prisma.sql`
    SELECT
      "academicYearId",
      "classId",
      "subjectId"
    FROM "ClassSubject"
    WHERE "schoolId" = ${schoolId}
      AND "academicYearId" IN (${Prisma.join(academicYearIds)})
  `);

  const existingKeys = new Set(
    existing.map(
      (item) =>
        `${item.academicYearId}:${item.classId}:${item.subjectId}`,
    ),
  );

  // ---------------------------------------------------------
  // 7. Separate new and existing mappings
  // ---------------------------------------------------------

  const toCreate = prepared.filter((row) => {
    const key = [
      row.academicYearId,
      row.classId,
      row.subjectId,
    ].join(":");

    return !existingKeys.has(key);
  });

  const skipped = prepared.length - toCreate.length;

  // ---------------------------------------------------------
  // 8. Create new mappings
  // ---------------------------------------------------------

  if (toCreate.length > 0) {
    await prisma.$transaction(
      toCreate.map((row) =>
        prisma.$executeRaw(Prisma.sql`
          INSERT INTO "ClassSubject" (
            "id",
            "schoolId",
            "academicYearId",
            "classId",
            "subjectId",
            "active",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${`cs_${crypto.randomUUID().replaceAll("-", "")}`},
            ${schoolId},
            ${row.academicYearId},
            ${row.classId},
            ${row.subjectId},
            ${row.active},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `),
      ),
    );
  }

  // ---------------------------------------------------------
  // 9. Return import summary
  // ---------------------------------------------------------

  return {
    created: toCreate.length,
    skipped,
    errors: [],
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

  async options(
  schoolId: string,
  academicYearId: string,
  classId: string,
) {
  const rows = await prisma.$queryRaw<
    {
      id: string;
      subjectId: string;
      subjectName: string;
      subjectCode: string | null;
    }[]
  >(Prisma.sql`
    SELECT
      cs."id",
      cs."subjectId",
      s."name" AS "subjectName",
      s."code" AS "subjectCode"
    FROM "ClassSubject" cs
    INNER JOIN "Subject" s
      ON s."id" = cs."subjectId"
    WHERE cs."schoolId" = ${schoolId}
      AND cs."academicYearId" = ${academicYearId}
      AND cs."classId" = ${classId}
      AND cs."active" = true
      AND s."active" = true
    ORDER BY
      s."displayOrder" ASC,
      s."name" ASC
  `);

  return rows.map((item) => ({
    id: item.subjectId,
    label: item.subjectCode
      ? `${item.subjectName}`
      : item.subjectName,
  }));
},
};

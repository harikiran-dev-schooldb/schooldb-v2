import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const INDIA_TIME_ZONE = "Asia/Kolkata";

function indiaDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: INDIA_TIME_ZONE,
  }).formatToParts(value);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

export type ActiveBirthdayStudent = {
  id: string;
  schoolId: string;
  fullName: string | null;
  admissionNo: string;
  whatsappOptIn: boolean;
};

export async function findActiveBirthdayStudents(now = new Date()) {
  const today = indiaDateParts(now);

  return prisma.$queryRaw<ActiveBirthdayStudent[]>(Prisma.sql`
    SELECT
      s."id",
      s."schoolId",
      s."fullName",
      s."admissionNo",
      s."whatsappOptIn"
    FROM "Student" s
    WHERE s."status"::text = 'ACTIVE'
      AND EXTRACT(MONTH FROM s."dob") = ${today.month}
      AND EXTRACT(DAY FROM s."dob") = ${today.day}
      AND EXISTS (
        SELECT 1
        FROM "StudentEnrollment" e
        WHERE e."studentId" = s."id"
          AND e."active" = true
      )
    ORDER BY s."schoolId", s."fullName"
  `);
}

export async function getBirthdaySummary(schoolId: string, now = new Date()) {
  const today = indiaDateParts(now);
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      admissionNo: string;
      fullName: string | null;
      imageUrl: string | null;
      whatsappOptIn: boolean;
      className: string;
      sectionName: string;
      total: bigint;
    }>
  >(Prisma.sql`
    SELECT
      s."id",
      s."admissionNo",
      s."fullName",
      s."imageUrl",
      s."whatsappOptIn",
      enrollment."className",
      enrollment."sectionName",
      COUNT(*) OVER()::bigint AS total
    FROM "Student" s
    JOIN LATERAL (
      SELECT
        c."name" AS "className",
        section."name" AS "sectionName"
      FROM "StudentEnrollment" e
      JOIN "Class" c ON c."id" = e."classId"
      JOIN "Section" section ON section."id" = e."sectionId"
      WHERE e."studentId" = s."id"
        AND e."active" = true
      ORDER BY e."createdAt" DESC
      LIMIT 1
    ) enrollment ON true
    WHERE s."schoolId" = ${schoolId}
      AND s."status"::text = 'ACTIVE'
      AND EXTRACT(MONTH FROM s."dob") = ${today.month}
      AND EXTRACT(DAY FROM s."dob") = ${today.day}
    ORDER BY s."fullName" ASC
    LIMIT 4
  `);

  return {
    birthdays: rows.map((student) => ({
      id: student.id,
      admissionNo: student.admissionNo,
      fullName: student.fullName,
      imageUrl: student.imageUrl,
      whatsappOptIn: student.whatsappOptIn,
      enrollments: [
        {
          class: { name: student.className },
          section: { name: student.sectionName },
        },
      ],
    })),
    total: Number(rows[0]?.total ?? 0),
  };
}

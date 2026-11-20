import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { summarizePublishChecklist, type PublishChecklist } from "../publish-checklist.ts";

export async function getExamPublishChecklist(
  db: Pick<Prisma.TransactionClient, "examSchedule" | "studentEnrollment">,
  exam: { id: string; schoolId: string; academicYearId: string },
): Promise<PublishChecklist> {
  const schedules = await db.examSchedule.findMany({
    where: { examId: exam.id, schoolId: exam.schoolId },
    select: {
      id: true,
      classId: true,
      sectionId: true,
      assessmentType: true,
      class: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });
  const enrollmentScopes = [...new Map(schedules.map((schedule) => [
    `${schedule.classId}:${schedule.sectionId ?? "all"}`,
    {
      classId: schedule.classId,
      ...(schedule.sectionId ? { sectionId: schedule.sectionId } : {}),
    },
  ])).values()];

  const enrollments = enrollmentScopes.length === 0 ? [] : await db.studentEnrollment.findMany({
    where: {
      schoolId: exam.schoolId,
      academicYearId: exam.academicYearId,
      active: true,
      student: { status: "ACTIVE", schoolId: exam.schoolId },
      OR: enrollmentScopes,
    },
    select: {
      id: true,
      classId: true,
      sectionId: true,
      section: { select: { name: true } },
      examMarks: {
        where: { schoolId: exam.schoolId, examSchedule: { examId: exam.id, schoolId: exam.schoolId } },
        select: { examScheduleId: true, status: true, marksObtained: true, grade: true },
      },
    },
  });

  const { summary, missingEntries } = summarizePublishChecklist(schedules, enrollments);
  const reviewKey = createHash("sha256").update(JSON.stringify([exam.id, summary, missingEntries])).digest("hex");
  return { ...summary, reviewKey };
}

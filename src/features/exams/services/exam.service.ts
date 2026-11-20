import { prisma } from "@/lib/prisma";
import { writeAuditLog, type AuditActor } from "@/lib/audit";
import { runSerializableTransaction } from "@/lib/prisma-transaction";
import {
  assignedExamScheduleFilter,
  type ExamTeacherAssignment,
} from "../exam-teacher-scope";
import { canOverrideExamPublish, requiresPublishOverride } from "../publish-checklist";
import { getExamPublishChecklist } from "./exam-publish-checklist.service";

function validateExamDates(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
) {
  if (startDate && Number.isNaN(startDate.getTime())) {
    throw new Error("Invalid exam start date.");
  }

  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid exam end date.");
  }

  if (startDate && endDate && endDate < startDate) {
    throw new Error(
      "Exam end date must be on or after the start date.",
    );
  }
}

function validateExamName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Exam name is required.");
  }

  if (trimmed.length > 100) {
    throw new Error(
      "Exam name must be 100 characters or less.",
    );
  }

  return trimmed;
}

export const examService = {
  /*
   * Get all exams for a school.
   */
  async getAll(
    schoolId: string,
    teacherScope?: readonly ExamTeacherAssignment[],
  ) {
    return prisma.exam.findMany({
      where: {
        schoolId,
        ...(teacherScope
          ? {
              OR: teacherScope.map((item) => ({
                academicYearId: item.academicYearId,
                schedules: {
                  some: assignedExamScheduleFilter(item),
                },
              })),
            }
          : {}),
      },

      include: {
        academicYear: true,

        _count: {
          select: {
            schedules: true,
          },
        },
      },

      orderBy: [
        {
          academicYear: {
            startDate: "desc",
          },
        },
        {
          startDate: "asc",
        },
      ],
    });
  },

  async getFailureOptions(
    schoolId: string,
    teacherScope?: readonly ExamTeacherAssignment[],
  ) {
    if (teacherScope?.length === 0) return [];

    return prisma.exam.findMany({
      where: {
        schoolId,
        status: { not: "CANCELLED" },
        ...(teacherScope && {
          OR: teacherScope.map((assignment) => ({
            academicYearId: assignment.academicYearId,
            schedules: {
              some: { schoolId, ...assignedExamScheduleFilter(assignment) },
            },
          })),
        }),
      },
      select: {
        id: true,
        name: true,
        status: true,
        academicYearId: true,
        academicYear: { select: { id: true, name: true, active: true } },
      },
      orderBy: [{ academicYear: { startDate: "desc" } }, { startDate: "asc" }],
    });
  },

  /*
   * Get a single exam.
   */
  async getById(
    examId: string,
    schoolId: string,
  ) {
    return prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId,
      },

      include: {
        academicYear: true,

        schedules: {
          include: {
            subject: true,
            class: true,
            section: true,
          },

          orderBy: {
            examDate: "asc",
          },
        },
      },
    });
  },

  /*
   * Create a new exam.
   */
  async create(
    schoolId: string,
    data: {
      academicYearId: string;
      name: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    const name = validateExamName(data.name);

    validateExamDates(
      data.startDate,
      data.endDate,
    );

    /*
     * Academic year must belong
     * to the current school.
     */
    const academicYear =
      await prisma.academicYear.findFirst({
        where: {
          id: data.academicYearId,
          schoolId,
        },

        select: {
          id: true,
        },
      });

    if (!academicYear) {
      throw new Error(
        "Academic year not found.",
      );
    }

    /*
     * Prevent duplicate exam names
     * within the same academic year.
     *
     * Prisma also enforces:
     * @@unique([schoolId, academicYearId, name])
     */
    const existing =
      await prisma.exam.findFirst({
        where: {
          schoolId,
          academicYearId:
            data.academicYearId,
          name,
        },

        select: {
          id: true,
        },
      });

    if (existing) {
      throw new Error(
        "An exam with this name already exists for the selected academic year.",
      );
    }

    return prisma.exam.create({
      data: {
        schoolId,

        academicYearId:
          data.academicYearId,

        name,

        startDate:
          data.startDate,

        endDate:
          data.endDate,
      },

      include: {
        academicYear: true,
      },
    });
  },

  /*
   * Update an existing exam.
   */
  async update(
    examId: string,
    actor: AuditActor,
    data: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
      status?: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
      annualWeight?: number;
      publishOverride?: { reason: string; reviewKey: string };
      correctionReason?: string;
    },
  ) {
    const { schoolId } = actor;
    return runSerializableTransaction(async (tx) => {
      const exam = await tx.exam.findFirst({ where: { id: examId, schoolId } });
      if (!exam) return { kind: "not-found" } as const;

      const name = data.name === undefined ? exam.name : validateExamName(data.name);
      const startDate = data.startDate ?? exam.startDate;
      const endDate = data.endDate ?? exam.endDate;
      validateExamDates(startDate, endDate);

      if (data.name !== undefined && name.toLowerCase() !== exam.name.toLowerCase()) {
        const duplicate = await tx.exam.findFirst({
          where: {
            schoolId,
            academicYearId: exam.academicYearId,
            name,
            NOT: { id: exam.id },
          },
          select: { id: true },
        });
        if (duplicate) {
          throw new Error("An exam with this name already exists for the selected academic year.");
        }
      }

      const publishing = data.status === "COMPLETED" && exam.status !== "COMPLETED";
      const reopening = exam.status === "COMPLETED" && data.status === "PUBLISHED";
      if (exam.status === "COMPLETED" && data.status && !["COMPLETED", "PUBLISHED"].includes(data.status)) {
        throw new Error("Published results can only be reopened for an audited correction.");
      }
      if (reopening && !data.correctionReason?.trim()) {
        throw new Error("Enter a reason before reopening published results.");
      }
      const checklist = publishing ? await getExamPublishChecklist(tx, exam) : null;
      const canOverride = canOverrideExamPublish(actor.role);
      const override = data.publishOverride;
      const overrideRequired = checklist !== null && requiresPublishOverride(checklist);
      if (overrideRequired && (
        !canOverride || !override?.reason.trim() || override.reviewKey !== checklist.reviewKey
      )) {
        return { kind: "checklist", checklist, canOverride } as const;
      }

      const updated = await tx.exam.update({
        where: { id: exam.id, schoolId },
        data: {
          name,
          startDate,
          endDate,
          status: data.status,
          annualWeight: data.annualWeight,
          ...(publishing ? { resultsLockedAt: new Date(), resultsLockedBy: actor.userId } : {}),
          ...(reopening ? { resultsLockedAt: null, resultsLockedBy: null, resultsVersion: { increment: 1 } } : {}),
        },
        include: { academicYear: true },
      });

      if (checklist) {
        // Persist the publication and any override reason together.
        await writeAuditLog(tx, {
          actor,
          module: "ACADEMICS",
          action: "PUBLISH",
          entityType: "EXAM",
          entityId: exam.id,
          summary: overrideRequired
            ? `Published incomplete results for ${name} with an administrator override.`
            : `Published results for ${name}.`,
          metadata: {
            expectedCount: checklist.expectedCount,
            missingCount: checklist.missingCount,
            scheduleCount: checklist.scheduleCount,
            ...(overrideRequired && override ? { overrideReason: override.reason } : {}),
          },
        });
      }

      if (reopening) {
        await writeAuditLog(tx, {
          actor,
          module: "ACADEMICS",
          action: "CORRECT",
          entityType: "EXAM",
          entityId: exam.id,
          summary: `Reopened published results for ${name}.`,
          metadata: { reason: data.correctionReason!, nextVersion: exam.resultsVersion + 1 },
        });
      }

      return { kind: "updated", exam: updated, published: publishing } as const;
    });
  },

  /*
   * Delete an exam.
   */
  async delete(
    examId: string,
    schoolId: string,
  ) {
    /*
     * Tenant-safe lookup first.
     */
    const exam =
      await prisma.exam.findFirst({
        where: {
          id: examId,
          schoolId,
        },
      });

    if (!exam) {
      return null;
    }

    await prisma.exam.delete({
      where: {
        id: exam.id,
        schoolId,
      },
    });

    return exam;
  },
};

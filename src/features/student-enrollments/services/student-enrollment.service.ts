import { ListQuery } from "@/types/query";

import { studentEnrollmentRepository } from "../repositories/student-enrollment.repository";
import { studentRepository } from "@/features/students/repositories/student.repository";
import { academicYearRepository } from "@/features/academic-years/repositories/academic-year.repository";
import { classRepository } from "@/features/classes/repositories/class.repository";
import { sectionRepository } from "@/features/sections/repositories/section.repository";

import {
  StudentEnrollmentFormOutput,
} from "../schemas/student-enrollment.schema";

import { studentActivityService } from "@/features/students/services/student-activity.service";
import { prisma } from "@/lib/prisma";

export type PromotionDecision = "PROMOTE" | "DETAIN";

export type PromotionInput = {
  studentIds: string[];
  sourceAcademicYearId: string;
  sourceClassId: string;
  sourceSectionId: string;
  targetAcademicYearId: string;
  targetClassId: string;
  targetSectionId: string;
  decision: PromotionDecision;
};

type SchoolPromotionInput = {
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
};

export type PromotionImportRow = {
  admissionNo: string;
  targetAcademicYear: string;
  targetClass: string;
  targetSection: string;
  decision: PromotionDecision;
};

async function preparePromotionImport(
  schoolId: string,
  rows: PromotionImportRow[],
) {
  const admissionNumbers = [...new Set(rows.map((row) => row.admissionNo.trim()))];
  const targetYearNames = [...new Set(rows.map((row) => row.targetAcademicYear.trim()))];
  const targetClassNames = [...new Set(rows.map((row) => row.targetClass.trim()))];

  const [students, years, classes] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, admissionNo: { in: admissionNumbers } },
      select: {
        id: true,
        admissionNo: true,
        enrollments: {
          where: { active: true },
          orderBy: { academicYear: { startDate: "desc" } },
          take: 2,
          select: {
            academicYearId: true,
            classId: true,
            sectionId: true,
          },
        },
      },
    }),
    prisma.academicYear.findMany({
      where: { schoolId, name: { in: targetYearNames } },
      select: { id: true, name: true },
    }),
    prisma.class.findMany({
      where: { schoolId, name: { in: targetClassNames }, active: true },
      select: {
        id: true,
        name: true,
        sections: {
          where: { active: true },
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  const studentByAdmission = new Map(
    students.map((student) => [student.admissionNo.trim().toLowerCase(), student]),
  );
  const yearByName = new Map(years.map((year) => [year.name.trim().toLowerCase(), year]));
  const classByName = new Map(classes.map((item) => [item.name.trim().toLowerCase(), item]));
  const seen = new Set<string>();
  const errors: Array<{ row: number; admissionNo: string; message: string }> = [];
  const groups = new Map<string, PromotionInput>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const admissionNo = row.admissionNo.trim();
    const duplicateKey = admissionNo.toLowerCase();
    const fail = (message: string) => errors.push({ row: rowNumber, admissionNo, message });

    if (!admissionNo || !row.targetAcademicYear.trim() || !row.targetClass.trim() || !row.targetSection.trim()) {
      fail("Admission number, target academic year, class and section are required.");
      return;
    }
    if (row.decision !== "PROMOTE" && row.decision !== "DETAIN") {
      fail("Decision must be PROMOTE or DETAIN.");
      return;
    }
    if (seen.has(duplicateKey)) {
      fail("Admission number is repeated in this file.");
      return;
    }
    seen.add(duplicateKey);

    const student = studentByAdmission.get(duplicateKey);
    if (!student) {
      fail("Student was not found.");
      return;
    }
    if (student.enrollments.length === 0) {
      fail("Student has no active source enrollment.");
      return;
    }
    if (student.enrollments.length > 1) {
      fail("Student has more than one active enrollment; close the old enrollment first.");
      return;
    }
    const source = student.enrollments[0];
    const targetYear = yearByName.get(row.targetAcademicYear.trim().toLowerCase());
    if (!targetYear) {
      fail(`Academic year not found: ${row.targetAcademicYear}.`);
      return;
    }
    if (source.academicYearId === targetYear.id) {
      fail("Target academic year must differ from the active source year.");
      return;
    }
    const targetClass = classByName.get(row.targetClass.trim().toLowerCase());
    if (!targetClass) {
      fail(`Class not found: ${row.targetClass}.`);
      return;
    }
    const targetSection = targetClass.sections.find(
      (section) => section.name.trim().toLowerCase() === row.targetSection.trim().toLowerCase(),
    );
    if (!targetSection) {
      fail(`Section ${row.targetSection} was not found under ${row.targetClass}.`);
      return;
    }
    if (row.decision === "DETAIN" && source.classId !== targetClass.id) {
      fail("A detained student must remain in the same class.");
      return;
    }

    const key = [
      source.academicYearId,
      source.classId,
      source.sectionId,
      targetYear.id,
      targetClass.id,
      targetSection.id,
      row.decision,
    ].join(":");
    const group = groups.get(key) ?? {
      studentIds: [],
      sourceAcademicYearId: source.academicYearId,
      sourceClassId: source.classId,
      sourceSectionId: source.sectionId,
      targetAcademicYearId: targetYear.id,
      targetClassId: targetClass.id,
      targetSectionId: targetSection.id,
      decision: row.decision,
    };
    group.studentIds.push(student.id);
    groups.set(key, group);
  });

  return { groups: [...groups.values()], errors };
}

async function buildSchoolPromotionPlan(schoolId: string, input: SchoolPromotionInput) {
  if (input.sourceAcademicYearId === input.targetAcademicYearId) {
    throw new Error("Source and target academic year must be different.");
  }

  const [sourceYear, targetYear, classes, enrollments] = await Promise.all([
    academicYearRepository.findById(input.sourceAcademicYearId, schoolId),
    academicYearRepository.findById(input.targetAcademicYearId, schoolId),
    prisma.class.findMany({
      where: { schoolId, active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        displayOrder: true,
        sections: {
          where: { active: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        },
      },
    }),
    prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        academicYearId: input.sourceAcademicYearId,
        active: true,
        student: { status: "ACTIVE" },
      },
      orderBy: [{ class: { displayOrder: "asc" } }, { section: { displayOrder: "asc" } }, { rollNo: "asc" }],
      select: {
        id: true,
        studentId: true,
        classId: true,
        sectionId: true,
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    }),
  ]);

  if (!sourceYear) throw new Error("Source academic year not found.");
  if (!targetYear) throw new Error("Target academic year not found.");

  const displayOrders = new Set(classes.map((item) => item.displayOrder));
  if (classes.length > 1 && displayOrders.size !== classes.length) {
    throw new Error(
      "Whole-school promotion needs a unique display order for every active class. Update class order first so SchoolDB does not guess the next class.",
    );
  }

  const classIndex = new Map(classes.map((item, index) => [item.id, index]));
  const grouped = new Map<
    string,
    {
      sourceClassId: string;
      sourceClassName: string;
      sourceSectionId: string;
      sourceSectionName: string;
      targetClassId: string;
      targetClassName: string;
      targetSectionId: string;
      targetSectionName: string;
      studentIds: string[];
    }
  >();
  let graduatingStudents = 0;
  let unmappedStudents = 0;

  for (const enrollment of enrollments) {
    const index = classIndex.get(enrollment.classId);
    if (index === undefined) {
      unmappedStudents += 1;
      continue;
    }
    const targetClass = classes[index + 1];
    if (!targetClass) {
      graduatingStudents += 1;
      continue;
    }
    const normalizedSection = enrollment.section.name.trim().toLowerCase();
    const targetSection =
      targetClass.sections.find(
        (section) => section.name.trim().toLowerCase() === normalizedSection,
      ) ?? (targetClass.sections.length === 1 ? targetClass.sections[0] : undefined);
    if (!targetSection) {
      unmappedStudents += 1;
      continue;
    }

    const key = `${enrollment.classId}:${enrollment.sectionId}`;
    const group = grouped.get(key) ?? {
      sourceClassId: enrollment.classId,
      sourceClassName: enrollment.class.name,
      sourceSectionId: enrollment.sectionId,
      sourceSectionName: enrollment.section.name,
      targetClassId: targetClass.id,
      targetClassName: targetClass.name,
      targetSectionId: targetSection.id,
      targetSectionName: targetSection.name,
      studentIds: [],
    };
    group.studentIds.push(enrollment.studentId);
    grouped.set(key, group);
  }

  return {
    sourceYear,
    targetYear,
    enrollments,
    groups: [...grouped.values()],
    graduatingStudents,
    unmappedStudents,
  };
}

async function validateEnrollmentRelations(
  schoolId: string,
  input: StudentEnrollmentFormOutput,
) {
  const [student, academicYear, cls, section] = await Promise.all([
    studentRepository.findById(input.studentId, schoolId),

    academicYearRepository.findById(
      input.academicYearId,
      schoolId,
    ),

    classRepository.findById(
      input.classId,
      schoolId,
    ),

    sectionRepository.findById(
      input.sectionId,
      schoolId,
    ),
  ]);

  if (!student) {
    throw new Error("Student not found.");
  }

  if (!academicYear) {
    throw new Error("Academic year not found.");
  }

  if (!cls) {
    throw new Error("Class not found.");
  }

  if (!section || section.classId !== input.classId) {
    throw new Error(
      "Selected section does not belong to the selected class.",
    );
  }
}

export const studentEnrollmentService = {
  /* ------------------------------------------------------------------ */
  /* LIST                                                               */
  /* ------------------------------------------------------------------ */

  async list(
    schoolId: string,
    query: ListQuery,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where = {
      schoolId,

      ...(query.classId && { classId: query.classId }),
      ...(query.sectionId && { sectionId: query.sectionId }),

      ...(query.search && {
        OR: [
          {
            student: {
              fullName: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          },

          {
            student: {
              admissionNo: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          },

          {
            class: {
              name: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          },

          {
            section: {
              name: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      studentEnrollmentRepository.list(where, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),

      studentEnrollmentRepository.count(where),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,

        studentId: item.studentId,
        studentName: item.student.fullName,
        admissionNo: item.student.admissionNo,

        academicYearId: item.academicYearId,
        academicYearName: item.academicYear.name,

        classId: item.classId,
        className: item.class.name,

        sectionId: item.sectionId,
        sectionName: item.section.name,

        rollNo: item.rollNo,

        admissionDate: item.admissionDate,

        active: item.active,
      })),

      total,
      page,
      pageSize,

      totalPages: Math.ceil(total / pageSize),
    };
  },

  /* ------------------------------------------------------------------ */
  /* CREATE                                                             */
  /* ------------------------------------------------------------------ */

  async create(
    schoolId: string,
    input: StudentEnrollmentFormOutput,
  ) {
    const exists =
      await studentEnrollmentRepository.findFirst({
        schoolId,
        studentId: input.studentId,
        academicYearId: input.academicYearId,
      });

    if (exists) {
      throw new Error(
        "Student is already enrolled in this academic year.",
      );
    }

    await validateEnrollmentRelations(
      schoolId,
      input,
    );

    const enrollment = await prisma.$transaction(async (tx) => {
      const created = await studentEnrollmentRepository.create(
        {
          school: {
            connect: {
              id: schoolId,
            },
          },

          student: {
            connect: {
              id: input.studentId,
            },
          },

          academicYear: {
            connect: {
              id: input.academicYearId,
            },
          },

          class: {
            connect: {
              id: input.classId,
            },
          },

          section: {
            connect: {
              id: input.sectionId,
            },
          },

          rollNo: input.rollNo,

          admissionDate: input.admissionDate
            ? new Date(input.admissionDate)
            : null,

          active: input.active,
        },
        tx,
      );

      /* -------------------------------------------------------------- */
      /* ACTIVITY                                                        */
      /* -------------------------------------------------------------- */

      await studentActivityService.create(
        {
          schoolId,
          studentId: created.studentId,
          enrollmentId: created.id,

          type: "ENROLLMENT_CREATED",

          title: "Student enrollment created",

          description: `${created.student.fullName ?? created.student.admissionNo} enrolled in ${created.class.name} — ${created.section.name} for ${created.academicYear.name}.`,
        },
        tx,
      );

      return created;
    });

    return enrollment;
  },

  /* ------------------------------------------------------------------ */
  /* GET                                                                */
  /* ------------------------------------------------------------------ */

  async get(
    id: string,
    schoolId: string,
  ) {
    const enrollment =
      await studentEnrollmentRepository.findById(
        id,
        schoolId,
      );

    if (!enrollment) {
      throw new Error(
        "Enrollment not found.",
      );
    }

    return enrollment;
  },

  /* ------------------------------------------------------------------ */
  /* UPDATE                                                             */
  /* ------------------------------------------------------------------ */

  async update(
    id: string,
    schoolId: string,
    input: StudentEnrollmentFormOutput,
  ) {
    const enrollment =
      await studentEnrollmentRepository.findById(
        id,
        schoolId,
      );

    if (!enrollment) {
      throw new Error(
        "Enrollment not found.",
      );
    }

    const duplicate =
      await studentEnrollmentRepository.findFirst({
        schoolId,
        studentId: input.studentId,

        academicYearId: input.academicYearId,

        NOT: {
          id,
        },
      });

    if (duplicate) {
      throw new Error(
        "Student is already enrolled in this academic year.",
      );
    }

    await validateEnrollmentRelations(
      schoolId,
      input,
    );

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await studentEnrollmentRepository.update(
        id,
        schoolId,
        {
          student: {
            connect: {
              id: input.studentId,
            },
          },

          academicYear: {
            connect: {
              id: input.academicYearId,
            },
          },

          class: {
            connect: {
              id: input.classId,
            },
          },

          section: {
            connect: {
              id: input.sectionId,
            },
          },

          rollNo: input.rollNo,

          admissionDate: input.admissionDate
            ? new Date(input.admissionDate)
            : null,

          active: input.active,
        },
        tx,
      );

      /* -------------------------------------------------------------- */
      /* DETECT CHANGES                                                 */
      /* -------------------------------------------------------------- */

      const changes: Record<
        string,
        {
          from: string | number | boolean | null;
          to: string | number | boolean | null;
        }
      > = {};

      if (enrollment.academicYearId !== saved.academicYearId) {
        changes.academicYear = {
          from: enrollment.academicYear.name,
          to: saved.academicYear.name,
        };
      }

      if (enrollment.classId !== saved.classId) {
        changes.class = {
          from: enrollment.class.name,
          to: saved.class.name,
        };
      }

      if (enrollment.sectionId !== saved.sectionId) {
        changes.section = {
          from: enrollment.section.name,
          to: saved.section.name,
        };
      }

      if (enrollment.rollNo !== saved.rollNo) {
        changes.rollNo = {
          from: enrollment.rollNo,
          to: saved.rollNo,
        };
      }

      if (
        enrollment.admissionDate?.getTime() !==
        saved.admissionDate?.getTime()
      ) {
        changes.admissionDate = {
          from: enrollment.admissionDate?.toISOString() ?? null,
          to: saved.admissionDate?.toISOString() ?? null,
        };
      }

      if (enrollment.active !== saved.active) {
        changes.active = {
          from: enrollment.active,
          to: saved.active,
        };
      }

      /* -------------------------------------------------------------- */
      /* ACTIVITY                                                        */
      /* -------------------------------------------------------------- */

      if (Object.keys(changes).length > 0) {
        await studentActivityService.create(
          {
            schoolId,
            studentId: saved.studentId,
            enrollmentId: saved.id,

            type: "ENROLLMENT_CHANGED",

            title: "Student enrollment updated",

            description: Object.entries(changes)
              .map(([field, change]) => {
                const label = field
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (char) => char.toUpperCase());

                const from = change.from ?? "—";
                const to = change.to ?? "—";

                return `${label}: ${from} → ${to}`;
              })
              .join(" | "),

            metadata: {
              changes,
            },
          },
          tx,
        );
      }

      return saved;
    });

    return updated;
  },

  /* ------------------------------------------------------------------ */
  /* PROMOTION PREVIEW                                                  */
  /* ------------------------------------------------------------------ */

  async previewPromotion(schoolId: string, input: PromotionInput) {
    if (input.studentIds.length === 0) {
      throw new Error("Select at least one student.");
    }

    if (input.sourceAcademicYearId === input.targetAcademicYearId) {
      throw new Error("Source and target academic year must be different.");
    }

    if (input.decision === "DETAIN" && input.targetClassId !== input.sourceClassId) {
      throw new Error("Detained students must remain in the same class.");
    }

    const [sourceAcademicYear, targetAcademicYear, targetClass, targetSection, sourceEnrollments] =
      await Promise.all([
        academicYearRepository.findById(input.sourceAcademicYearId, schoolId),
        academicYearRepository.findById(input.targetAcademicYearId, schoolId),
        classRepository.findById(input.targetClassId, schoolId),
        sectionRepository.findById(input.targetSectionId, schoolId),
        prisma.studentEnrollment.findMany({
          where: {
            schoolId,
            studentId: { in: input.studentIds },
            academicYearId: input.sourceAcademicYearId,
            classId: input.sourceClassId,
            sectionId: input.sourceSectionId,
            active: true,
          },
          select: {
            id: true,
            studentId: true,
            student: {
              select: { admissionNo: true, fullName: true },
            },
          },
        }),
      ]);

    if (!sourceAcademicYear) throw new Error("Source academic year not found.");
    if (!targetAcademicYear) throw new Error("Target academic year not found.");
    if (!targetClass) throw new Error("Target class not found.");
    if (!targetSection || targetSection.classId !== input.targetClassId) {
      throw new Error("Target section does not belong to the selected target class.");
    }
    if (sourceEnrollments.length !== input.studentIds.length) {
      throw new Error(
        "One or more selected students do not belong to the selected source class and section.",
      );
    }

    const enrollmentIds = sourceEnrollments.map((item) => item.id);
    const [existingTargets, dueInstallments, examSchedules] = await Promise.all([
      prisma.studentEnrollment.findMany({
        where: {
          schoolId,
          academicYearId: input.targetAcademicYearId,
          studentId: { in: input.studentIds },
        },
        select: { studentId: true },
      }),
      prisma.studentFeeInstallment.findMany({
        where: {
          status: { in: ["PENDING", "PARTIAL"] },
          studentFeeItem: {
            studentFee: {
              schoolId,
              studentEnrollmentId: { in: enrollmentIds },
            },
          },
        },
        select: {
          payableAmount: true,
          paidAmount: true,
          studentFeeItem: {
            select: {
              studentFee: { select: { studentEnrollmentId: true } },
            },
          },
        },
      }),
      prisma.examSchedule.findMany({
        where: {
          schoolId,
          classId: input.sourceClassId,
          OR: [{ sectionId: null }, { sectionId: input.sourceSectionId }],
          exam: {
            schoolId,
            academicYearId: input.sourceAcademicYearId,
            active: true,
            status: { in: ["PUBLISHED", "COMPLETED"] },
          },
        },
        select: {
          id: true,
          passMarks: true,
          exam: { select: { id: true, status: true } },
        },
      }),
    ]);

    const completedSchedules = examSchedules.filter(
      (schedule) => schedule.exam.status === "COMPLETED",
    );
    const marks = completedSchedules.length
      ? await prisma.studentExamMark.findMany({
          where: {
            schoolId,
            studentEnrollmentId: { in: enrollmentIds },
            examScheduleId: { in: completedSchedules.map((item) => item.id) },
          },
          select: {
            studentEnrollmentId: true,
            examScheduleId: true,
            marksObtained: true,
            status: true,
          },
        })
      : [];

    const enrollmentToStudent = new Map(
      sourceEnrollments.map((item) => [item.id, item.studentId]),
    );
    const passMarks = new Map(
      completedSchedules.map((item) => [item.id, item.passMarks]),
    );
    const failedStudentIds = new Set<string>();

    for (const mark of marks) {
      const studentId = enrollmentToStudent.get(mark.studentEnrollmentId);
      const required = passMarks.get(mark.examScheduleId);
      if (
        studentId &&
        (mark.status === "ABSENT" ||
          (required !== null &&
            mark.marksObtained !== null &&
            Number(mark.marksObtained) < Number(required)))
      ) {
        failedStudentIds.add(studentId);
      }
    }

    const dueEnrollmentIds = new Set(
      dueInstallments.map((item) => item.studentFeeItem.studentFee.studentEnrollmentId),
    );
    const outstandingAmount = dueInstallments.reduce(
      (sum, item) => sum + Number(item.payableAmount) - Number(item.paidAmount),
      0,
    );
    const expectedCompletedMarks = completedSchedules.length * sourceEnrollments.length;
    const openExamIds = new Set(
      examSchedules
        .filter((schedule) => schedule.exam.status !== "COMPLETED")
        .map((schedule) => schedule.exam.id),
    );

    return {
      decision: input.decision,
      selected: sourceEnrollments.length,
      eligible: sourceEnrollments.length - existingTargets.length,
      alreadyEnrolled: existingTargets.length,
      feeWarnings: {
        students: dueEnrollmentIds.size,
        installments: dueInstallments.length,
        outstandingAmount,
      },
      resultWarnings: {
        openExams: openExamIds.size,
        missingCompletedMarks: Math.max(0, expectedCompletedMarks - marks.length),
        studentsBelowPassMark: failedStudentIds.size,
      },
      sourceYearEnded: sourceAcademicYear.endDate < new Date(),
      sourceAcademicYearName: sourceAcademicYear.name,
      targetAcademicYearName: targetAcademicYear.name,
      targetClassName: targetClass.name,
      targetSectionName: targetSection.name,
    };
  },

  async previewSchoolPromotion(schoolId: string, input: SchoolPromotionInput) {
    const plan = await buildSchoolPromotionPlan(schoolId, input);
    const eligibleStudentIds = plan.groups.flatMap((group) => group.studentIds);
    const enrollmentIds = plan.enrollments.map((item) => item.id);
    const [existingTargets, dueInstallments, examSchedules] = await Promise.all([
      prisma.studentEnrollment.count({
        where: {
          schoolId,
          academicYearId: input.targetAcademicYearId,
          studentId: { in: eligibleStudentIds },
        },
      }),
      prisma.studentFeeInstallment.findMany({
        where: {
          status: { in: ["PENDING", "PARTIAL"] },
          studentFeeItem: {
            studentFee: { schoolId, studentEnrollmentId: { in: enrollmentIds } },
          },
        },
        select: {
          payableAmount: true,
          paidAmount: true,
          studentFeeItem: {
            select: { studentFee: { select: { studentEnrollmentId: true } } },
          },
        },
      }),
      prisma.examSchedule.findMany({
        where: {
          schoolId,
          exam: {
            schoolId,
            academicYearId: input.sourceAcademicYearId,
            active: true,
            status: { in: ["PUBLISHED", "COMPLETED"] },
          },
        },
        select: {
          id: true,
          classId: true,
          sectionId: true,
          passMarks: true,
          exam: { select: { id: true, status: true } },
        },
      }),
    ]);

    const completedSchedules = examSchedules.filter((item) => item.exam.status === "COMPLETED");
    const marks = completedSchedules.length
      ? await prisma.studentExamMark.findMany({
          where: {
            schoolId,
            studentEnrollmentId: { in: enrollmentIds },
            examScheduleId: { in: completedSchedules.map((item) => item.id) },
          },
          select: {
            studentEnrollmentId: true,
            examScheduleId: true,
            status: true,
            marksObtained: true,
          },
        })
      : [];

    const enrollmentById = new Map(plan.enrollments.map((item) => [item.id, item]));
    const schedulesById = new Map(completedSchedules.map((item) => [item.id, item]));
    const failedStudents = new Set<string>();
    for (const mark of marks) {
      const enrollment = enrollmentById.get(mark.studentEnrollmentId);
      const schedule = schedulesById.get(mark.examScheduleId);
      if (!enrollment || !schedule) continue;
      if (
        mark.status === "ABSENT" ||
        (schedule.passMarks !== null &&
          mark.marksObtained !== null &&
          Number(mark.marksObtained) < Number(schedule.passMarks))
      ) {
        failedStudents.add(enrollment.studentId);
      }
    }

    const classWideScheduleCount = new Map<string, number>();
    const sectionScheduleCount = new Map<string, number>();
    for (const schedule of completedSchedules) {
      if (schedule.sectionId === null) {
        classWideScheduleCount.set(
          schedule.classId,
          (classWideScheduleCount.get(schedule.classId) ?? 0) + 1,
        );
      } else {
        const key = `${schedule.classId}:${schedule.sectionId}`;
        sectionScheduleCount.set(key, (sectionScheduleCount.get(key) ?? 0) + 1);
      }
    }
    const expectedMarks = plan.enrollments.reduce(
      (total, enrollment) =>
        total +
        (classWideScheduleCount.get(enrollment.classId) ?? 0) +
        (sectionScheduleCount.get(`${enrollment.classId}:${enrollment.sectionId}`) ?? 0),
      0,
    );
    const dueEnrollmentIds = new Set(
      dueInstallments.map((item) => item.studentFeeItem.studentFee.studentEnrollmentId),
    );

    return {
      selected: plan.enrollments.length,
      eligible: Math.max(0, eligibleStudentIds.length - existingTargets),
      alreadyEnrolled: existingTargets,
      graduatingStudents: plan.graduatingStudents,
      unmappedStudents: plan.unmappedStudents,
      sourceYearEnded: plan.sourceYear.endDate < new Date(),
      sourceAcademicYearName: plan.sourceYear.name,
      targetAcademicYearName: plan.targetYear.name,
      feeWarnings: {
        students: dueEnrollmentIds.size,
        installments: dueInstallments.length,
        outstandingAmount: dueInstallments.reduce(
          (sum, item) => sum + Number(item.payableAmount) - Number(item.paidAmount),
          0,
        ),
      },
      resultWarnings: {
        openExams: new Set(
          examSchedules.filter((item) => item.exam.status !== "COMPLETED").map((item) => item.exam.id),
        ).size,
        missingCompletedMarks: Math.max(0, expectedMarks - marks.length),
        studentsBelowPassMark: failedStudents.size,
      },
      mappings: plan.groups.map((group) => ({
        source: `${group.sourceClassName} — ${group.sourceSectionName}`,
        target: `${group.targetClassName} — ${group.targetSectionName}`,
        students: group.studentIds.length,
      })),
    };
  },

  async promoteSchool(schoolId: string, input: SchoolPromotionInput) {
    const plan = await buildSchoolPromotionPlan(schoolId, input);
    const summary = {
      created: 0,
      skipped: 0,
      graduatingStudents: plan.graduatingStudents,
      unmappedStudents: plan.unmappedStudents,
      groups: [] as Array<{
        source: string;
        target: string;
        created: number;
        skipped: number;
        studentIds: string[];
      }>,
    };

    for (let index = 0; index < plan.groups.length; index += 4) {
      const groupBatch = plan.groups.slice(index, index + 4);
      const results = await Promise.all(
        groupBatch.map(async (group) => ({
          group,
          result: await studentEnrollmentService.promote(schoolId, {
            studentIds: group.studentIds,
            sourceAcademicYearId: input.sourceAcademicYearId,
            sourceClassId: group.sourceClassId,
            sourceSectionId: group.sourceSectionId,
            targetAcademicYearId: input.targetAcademicYearId,
            targetClassId: group.targetClassId,
            targetSectionId: group.targetSectionId,
            decision: "PROMOTE",
          }),
        })),
      );
      for (const { group, result } of results) {
        summary.created += result.created;
        summary.skipped += result.skipped;
        summary.groups.push({
          source: `${group.sourceClassName} — ${group.sourceSectionName}`,
          target: `${group.targetClassName} — ${group.targetSectionName}`,
          created: result.created,
          skipped: result.skipped,
          studentIds: result.students.map((student) => student.studentId),
        });
      }
    }

    return summary;
  },

  async previewPromotionImport(schoolId: string, rows: PromotionImportRow[]) {
    if (rows.length === 0) throw new Error("No promotion rows were provided.");
    if (rows.length > 5_000) throw new Error("A promotion file can contain up to 5,000 rows.");
    const prepared = await preparePromotionImport(schoolId, rows);
    if (prepared.errors.length > 0) {
      return {
        total: rows.length,
        valid: rows.length - prepared.errors.length,
        errors: prepared.errors,
        eligible: 0,
        alreadyEnrolled: 0,
        feeWarnings: { students: 0, installments: 0, outstandingAmount: 0 },
        resultWarnings: { openExams: 0, missingCompletedMarks: 0, studentsBelowPassMark: 0 },
        mappings: [],
      };
    }

    const previews = [];
    for (let index = 0; index < prepared.groups.length; index += 4) {
      previews.push(
        ...(await Promise.all(
          prepared.groups.slice(index, index + 4).map((group) =>
            studentEnrollmentService.previewPromotion(schoolId, group),
          ),
        )),
      );
    }

    return {
      total: rows.length,
      valid: rows.length,
      errors: prepared.errors,
      eligible: previews.reduce((sum, item) => sum + item.eligible, 0),
      alreadyEnrolled: previews.reduce((sum, item) => sum + item.alreadyEnrolled, 0),
      feeWarnings: {
        students: previews.reduce((sum, item) => sum + item.feeWarnings.students, 0),
        installments: previews.reduce((sum, item) => sum + item.feeWarnings.installments, 0),
        outstandingAmount: previews.reduce((sum, item) => sum + item.feeWarnings.outstandingAmount, 0),
      },
      resultWarnings: {
        openExams: previews.reduce((sum, item) => sum + item.resultWarnings.openExams, 0),
        missingCompletedMarks: previews.reduce((sum, item) => sum + item.resultWarnings.missingCompletedMarks, 0),
        studentsBelowPassMark: previews.reduce((sum, item) => sum + item.resultWarnings.studentsBelowPassMark, 0),
      },
      mappings: previews.map((item) => ({
        decision: item.decision,
        target: `${item.targetAcademicYearName} · ${item.targetClassName} — ${item.targetSectionName}`,
        students: item.selected,
      })),
    };
  },

  async importPromotions(schoolId: string, rows: PromotionImportRow[]) {
    if (rows.length === 0) throw new Error("No promotion rows were provided.");
    if (rows.length > 500) throw new Error("Maximum 500 promotion rows per batch.");
    const prepared = await preparePromotionImport(schoolId, rows);
    if (prepared.errors.length > 0) {
      const first = prepared.errors[0];
      throw new Error(`Row ${first.row}: ${first.message}`);
    }

    const results = [];
    for (let index = 0; index < prepared.groups.length; index += 4) {
      results.push(
        ...(await Promise.all(
          prepared.groups.slice(index, index + 4).map((group) =>
            studentEnrollmentService.promote(schoolId, group),
          ),
        )),
      );
    }
    return {
      created: results.reduce((sum, item) => sum + item.created, 0),
      skipped: results.reduce((sum, item) => sum + item.skipped, 0),
      errors: [],
    };
  },

  /* ------------------------------------------------------------------ */
  /* PROMOTE STUDENTS                                                   */
  /* ------------------------------------------------------------------ */

  async promote(
    schoolId: string,
    input: PromotionInput,
  ) {
    if (input.studentIds.length === 0) {
      throw new Error(
        "Select at least one student to promote.",
      );
    }

    if (
      input.sourceAcademicYearId ===
      input.targetAcademicYearId
    ) {
      throw new Error(
        "Source and target academic year must be different.",
      );
    }

    if (input.decision === "DETAIN" && input.targetClassId !== input.sourceClassId) {
      throw new Error("Detained students must remain in the same class.");
    }

    /*
     * --------------------------------------------------------------
     * Validate target academic year
     * --------------------------------------------------------------
     */

    const targetAcademicYear =
      await academicYearRepository.findById(
        input.targetAcademicYearId,
        schoolId,
      );

    if (!targetAcademicYear) {
      throw new Error(
        "Target academic year not found.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Validate target class
     * --------------------------------------------------------------
     */

    const targetClass =
      await classRepository.findById(
        input.targetClassId,
        schoolId,
      );

    if (!targetClass) {
      throw new Error(
        "Target class not found.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Validate target section
     * --------------------------------------------------------------
     */

    const targetSection =
      await sectionRepository.findById(
        input.targetSectionId,
        schoolId,
      );

    if (!targetSection) {
      throw new Error(
        "Target section not found.",
      );
    }

    if (
      targetSection.classId !==
      input.targetClassId
    ) {
      throw new Error(
        "Target section does not belong to the selected target class.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Validate source enrollments
     * --------------------------------------------------------------
     */

    const sourceEnrollments =
      await studentEnrollmentRepository.list(
        {
          schoolId,

          studentId: {
            in: input.studentIds,
          },

          academicYearId:
            input.sourceAcademicYearId,

          classId:
            input.sourceClassId,

          sectionId:
            input.sourceSectionId,

          active: true,
        },
        {
          take: input.studentIds.length,
        },
      );

    if (
      sourceEnrollments.length !==
      input.studentIds.length
    ) {
      throw new Error(
        "One or more selected students do not belong to the selected source class and section.",
      );
    }

    /*
     * --------------------------------------------------------------
     * Perform promotion
     * --------------------------------------------------------------
     */

    const result = await prisma.$transaction(async (tx) => {
      const promoted = await studentEnrollmentRepository.promoteMany(
        schoolId,
        input,
        tx,
      );

      /*
       * --------------------------------------------------------------
       * Record activity
       * --------------------------------------------------------------
       */

      for (const enrollment of promoted.created) {
        await studentActivityService.create(
          {
            schoolId,

            studentId: enrollment.studentId,

            enrollmentId: enrollment.id,

            type: "STUDENT_PROMOTED",

            title: input.decision === "DETAIN" ? "Student detained" : "Student promoted",

            description: `${enrollment.student.fullName ?? enrollment.student.admissionNo} promoted to ${enrollment.class.name} — ${enrollment.section.name} for ${enrollment.academicYear.name}.`,

            metadata: {
              promotion: true,

              decision: input.decision,

              promotedFromId: enrollment.promotedFromId,

              targetAcademicYearId: enrollment.academicYearId,

              targetClassId: enrollment.classId,

              targetSectionId: enrollment.sectionId,

              rollNo: enrollment.rollNo,
            },
          },
          tx,
        );
      }

      return promoted;
    });

    return {
      decision: input.decision,
      created: result.created.length,

      skipped: result.skipped.length,

      students: result.created.map(
        (enrollment) => ({
          studentId:
            enrollment.studentId,

          admissionNo:
            enrollment.student.admissionNo,

          fullName:
            enrollment.student.fullName,

          rollNo:
            enrollment.rollNo,

          className:
            enrollment.class.name,

          sectionName:
            enrollment.section.name,

          academicYearName:
            enrollment.academicYear.name,
        }),
      ),

      skippedStudents:
        result.skipped,
    };
  },

  /* ------------------------------------------------------------------ */
  /* OPTIONS                                                            */
  /* ------------------------------------------------------------------ */

  async options(
  schoolId: string,
  filters?: {
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
  },
) {
  return studentEnrollmentRepository.options(
    schoolId,
    filters,
  );
},
};

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

    const enrollment =
      await studentEnrollmentRepository.create({
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
      });

    /* -------------------------------------------------------------- */
    /* ACTIVITY                                                        */
    /* -------------------------------------------------------------- */

    await studentActivityService.create({
  schoolId,
  studentId: enrollment.studentId,
  enrollmentId: enrollment.id,

  type: "ENROLLMENT_CREATED",

  title: "Student enrollment created",

  description: `${enrollment.student.fullName ?? enrollment.student.admissionNo} enrolled in ${enrollment.class.name} — ${enrollment.section.name} for ${enrollment.academicYear.name}.`,
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

    const updated =
      await studentEnrollmentRepository.update(
        id,
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

    if (
      enrollment.academicYearId !==
      updated.academicYearId
    ) {
      changes.academicYear = {
        from: enrollment.academicYear.name,
        to: updated.academicYear.name,
      };
    }

    if (
      enrollment.classId !==
      updated.classId
    ) {
      changes.class = {
        from: enrollment.class.name,
        to: updated.class.name,
      };
    }

    if (
      enrollment.sectionId !==
      updated.sectionId
    ) {
      changes.section = {
        from: enrollment.section.name,
        to: updated.section.name,
      };
    }

    if (
      enrollment.rollNo !==
      updated.rollNo
    ) {
      changes.rollNo = {
        from: enrollment.rollNo,
        to: updated.rollNo,
      };
    }

    if (
      enrollment.admissionDate?.getTime() !==
      updated.admissionDate?.getTime()
    ) {
      changes.admissionDate = {
  from: enrollment.admissionDate?.toISOString() ?? null,
  to: updated.admissionDate?.toISOString() ?? null,
};
    }

    if (
      enrollment.active !==
      updated.active
    ) {
      changes.active = {
        from: enrollment.active,
        to: updated.active,
      };
    }

    /* -------------------------------------------------------------- */
    /* ACTIVITY                                                        */
    /* -------------------------------------------------------------- */

    if (Object.keys(changes).length > 0) {
      await studentActivityService.create({
  schoolId,
  studentId: updated.studentId,
  enrollmentId: updated.id,

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
});
    }

    return updated;
  },

  /* ------------------------------------------------------------------ */
  /* OPTIONS                                                            */
  /* ------------------------------------------------------------------ */

  async options(
    schoolId: string,
  ) {
    return studentEnrollmentRepository.options(
      schoolId,
    );
  },
};
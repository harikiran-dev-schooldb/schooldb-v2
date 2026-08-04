import { ListQuery } from "@/types/query";

import { studentEnrollmentRepository } from "../repositories/student-enrollment.repository";
import { studentRepository } from "@/features/students/repositories/student.repository";
import { academicYearRepository } from "@/features/academic-years/repositories/academic-year.repository";
import { classRepository } from "@/features/classes/repositories/class.repository";
import { sectionRepository } from "@/features/sections/repositories/section.repository";

import {
  StudentEnrollmentFormOutput,
} from "../schemas/student-enrollment.schema";

async function validateEnrollmentRelations(
  schoolId: string,
  input: StudentEnrollmentFormOutput,
) {
  const [student, academicYear, cls, section] = await Promise.all([
    studentRepository.findById(input.studentId, schoolId),
    academicYearRepository.findById(input.academicYearId, schoolId),
    classRepository.findById(input.classId, schoolId),
    sectionRepository.findById(input.sectionId, schoolId),
  ]);

  if (!student) throw new Error("Student not found.");
  if (!academicYear) throw new Error("Academic year not found.");
  if (!cls) throw new Error("Class not found.");
  if (!section || section.classId !== input.classId) {
    throw new Error("Selected section does not belong to the selected class.");
  }
}

export const studentEnrollmentService = {
  async list(
    schoolId: string,
    query: ListQuery
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

  async create(
    schoolId: string,
    input: StudentEnrollmentFormOutput
  ) {
    const exists =
      await studentEnrollmentRepository.findFirst({
        studentId: input.studentId,
        academicYearId: input.academicYearId,
      });

    if (exists) {
      throw new Error(
        "Student is already enrolled in this academic year."
      );
    }

    await validateEnrollmentRelations(schoolId, input);

    return studentEnrollmentRepository.create({
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
  },

  async get(
    id: string,
    schoolId: string
  ) {
    const enrollment =
      await studentEnrollmentRepository.findById(
        id,
        schoolId
      );

    if (!enrollment) {
      throw new Error(
        "Enrollment not found."
      );
    }

    return enrollment;
  },

  async update(
    id: string,
    schoolId: string,
    input: StudentEnrollmentFormOutput
  ) {
    const enrollment =
      await studentEnrollmentRepository.findById(
        id,
        schoolId
      );

    if (!enrollment) {
      throw new Error(
        "Enrollment not found."
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
        "Student is already enrolled in this academic year."
      );
    }

    await validateEnrollmentRelations(schoolId, input);

    return studentEnrollmentRepository.update(
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
      }
    );
  },

  async options(schoolId: string) {
  return studentEnrollmentRepository.options(
    schoolId
  );
},
};

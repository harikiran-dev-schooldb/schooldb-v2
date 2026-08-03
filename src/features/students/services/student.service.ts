import { studentRepository } from "../repositories/student.repository";
import { StudentFormInput, StudentFormOutput } from "../schemas/student.schema";
import { StudentStatus } from "@/generated/prisma/enums";
import { ListQuery } from "@/types/query";
import { sectionRepository } from "@/features/sections/repositories/section.repository";

export const studentService = {
  async list(schoolId: string, query: ListQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where = {
      schoolId,

      status: query.status ?? StudentStatus.ACTIVE,

      ...(query.search && {
        OR: [
          {
            admissionNo: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
          {
            fullName: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
          {
            phone: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
    };

    const [students, total] = await Promise.all([
      studentRepository.list(where, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      studentRepository.count(where),
    ]);

    return {
      data: students.map((student) => ({
        ...student,
        className: student.class?.name,
        sectionName: student.section?.name,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async create(
    schoolId: string,
    input: StudentFormOutput
  ) {
    const exists = await studentRepository.findByAdmissionNo(
      schoolId,
      input.admissionNo
    );

    if (exists) {
      throw new Error("Admission number already exists.");
    }

    if (input.sectionId) {
      const section = await sectionRepository.findById(
        input.sectionId,
        schoolId
      );

      if (!section || section.classId !== input.classId) {
        throw new Error(
          "Selected section does not belong to the selected class."
        );
      }
    }

    return studentRepository.create({
      admissionNo: input.admissionNo,
      fullName: input.fullName,
      gender: input.gender,
      dob: new Date(input.dob),
      phone: input.phone,
      email: input.email,
      status: StudentStatus.ACTIVE,
      rollNo: input.rollNo,

      school: {
        connect: {
          id: schoolId,
        },
      },

      ...(input.classId && {
        class: {
          connect: {
            id: input.classId,
          },
        },
      }),

      ...(input.sectionId && {
        section: {
          connect: {
            id: input.sectionId,
          },
        },
      }),
    });
  },

  async get(id: string, schoolId: string) {
    const student = await studentRepository.findById(
      id,
      schoolId
    );

    if (!student) {
      throw new Error("Student not found.");
    }

    return student;
  },

  async update(
    id: string,
    schoolId: string,
    input: StudentFormOutput
  ) {
    const student = await studentRepository.findById(
      id,
      schoolId
    );

    if (!student) {
      throw new Error("Student not found.");
    }

    const duplicate = await studentRepository.findFirst({
      schoolId,
      admissionNo: input.admissionNo,
      NOT: {
        id,
      },
    });

    if (duplicate) {
      throw new Error("Admission number already exists.");
    }

    if (input.sectionId) {
      const section = await sectionRepository.findById(
        input.sectionId,
        schoolId
      );

      if (!section || section.classId !== input.classId) {
        throw new Error(
          "Selected section does not belong to the selected class."
        );
      }
    }

    return studentRepository.update(id, {
      admissionNo: input.admissionNo,
      fullName: input.fullName,
      gender: input.gender,
      dob: new Date(input.dob),
      phone: input.phone,
      email: input.email,
      status: StudentStatus.ACTIVE,
      rollNo: input.rollNo,

      ...(input.classId && {
        class: {
          connect: {
            id: input.classId,
          },
        },
      }),

      ...(input.sectionId && {
        section: {
          connect: {
            id: input.sectionId,
          },
        },
      }),
    });
  },

  async changeStatus(
    id: string,
    schoolId: string,
    status: StudentStatus,
    remarks?: string
  ) {
    const student = await studentRepository.findById(
      id,
      schoolId
    );

    if (!student) {
      throw new Error("Student not found.");
    }

    if (student.status === status) {
      throw new Error(
        "Student already has this status."
      );
    }

    return studentRepository.changeStatus(
      id,
      status,
      remarks
    );
  },

  async profile(
    id: string,
    schoolId: string
  ) {
    const student = await studentRepository.findById(
      id,
      schoolId
    );

    if (!student) {
      throw new Error("Student not found.");
    }

    return student;
  },
};
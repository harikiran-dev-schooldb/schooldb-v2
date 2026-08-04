import { studentRepository } from "../repositories/student.repository";
import { StudentFormOutput } from "../schemas/student.schema";
import { StudentStatus } from "@/generated/prisma/enums";
import { ListQuery } from "@/types/query";

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
      data: students.map(({ enrollments, ...student }) => {
        const enrollment = enrollments[0];

        return {
          ...student,
          className: enrollment?.class.name ?? null,
          sectionName: enrollment?.section.name ?? null,
        };
      }),
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

    return studentRepository.create({
      admissionNo: input.admissionNo,
      fullName: input.fullName,
      gender: input.gender,
      dob: new Date(input.dob),
      phone: input.phone,
      email: input.email,
      status: StudentStatus.ACTIVE,

      school: {
        connect: {
          id: schoolId,
        },
      },

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

    return studentRepository.update(id, {
      admissionNo: input.admissionNo,
      fullName: input.fullName,
      gender: input.gender,
      dob: new Date(input.dob),
      phone: input.phone,
      email: input.email,
      status: StudentStatus.ACTIVE,

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
  const student = await studentRepository.profile(
    id,
    schoolId
  );

  if (!student) {
    throw new Error("Student not found.");
  }

  return student;
},

  async options(schoolId: string) {
  const students = await studentRepository.options(schoolId);

  return students.map((student) => ({
    id: student.id,
    label: student.fullName
      ? `${student.admissionNo} — ${student.fullName}`
      : student.admissionNo,
  }));
},
};

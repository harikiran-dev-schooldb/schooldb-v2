import { studentRepository } from "../repositories/student.repository";
import { StudentFormInput } from "../schemas/student.schema";
import { StudentStatus } from "@/generated/prisma/enums";
import { ListQuery } from "@/types/query";



export const studentService = {
  async list(schoolId: string, query: ListQuery) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;

  const skip = (page - 1) * pageSize;

  const where = {
    schoolId,
    status: StudentStatus.ACTIVE,

    ...(query.status && {
    status: query.status,
  }),

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
      skip,
      take: pageSize,
    }),
    studentRepository.count(where),
  ]);

  return {
    data: students,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
},

  async create(
    schoolId: string,
    input: StudentFormInput
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
  const student = await studentRepository.findById(id, schoolId);

  if (!student) {
    throw new Error("Student not found");
  }

  return student;
},

 async update(
  id: string,
  schoolId: string,
  input: StudentFormInput
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

  return studentRepository.update(id, schoolId, {
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
    throw new Error("Student not found");
  }

  if (student.status === status) {
    throw new Error("Student already has this status.");
  }

  return studentRepository.changeStatus(
    id,
    schoolId,
    status,
    remarks
  );
},

async profile(id: string, schoolId: string) {
  return studentRepository.findById(id, schoolId);
},

};
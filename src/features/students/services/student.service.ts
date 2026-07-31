import { prisma } from "@/lib/prisma";
import { studentRepository } from "../repositories/student.repository";
import { StudentFormInput } from "../schemas/student.schema";
import { StudentStatus } from "@/generated/prisma/browser";


export const studentService = {
  async getAll(schoolId: string) {
    return studentRepository.findMany({
      schoolId,
      status: StudentStatus.ACTIVE,
    });
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

 async getById(id: string, schoolId: string) {
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
  const student = await prisma.student.findFirst({
    where: {
      id,
      schoolId,
    },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  const duplicate = await prisma.student.findFirst({
    where: {
      schoolId,
      admissionNo: input.admissionNo,
      NOT: {
        id,
      },
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

  return studentRepository.changeStatus(
    id,
    schoolId,
    status,
    remarks
  );
}
};
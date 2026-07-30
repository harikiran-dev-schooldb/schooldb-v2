import { studentRepository } from "../repositories/student.repository";
import { CreateStudentInput } from "../schemas/student.schema";

export const studentService = {
  async getAll(schoolId: string) {
    return studentRepository.findMany({
      schoolId,
      active: true,
    });
  },

  async create(
    schoolId: string,
    input: CreateStudentInput
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
      dob: input.dob,
      phone: input.phone,
      email: input.email,
      status: input.status,
      active: true,

      school: {
        connect: {
          id: schoolId,
        },
      },
    });
  },
};
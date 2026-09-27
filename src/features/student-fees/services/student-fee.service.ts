import { studentFeeRepository } from "../repositories/student-fee.repository";

import type {
  StudentFeeAssignmentInput,
} from "../schemas/student-fee.schema";

export const studentFeeService = {
  list(
    schoolId: string,
    studentId?: string,
  ) {
    return studentFeeRepository.list(
      schoolId,
      studentId,
    );
  },

  async assign(
    schoolId: string,
    input: StudentFeeAssignmentInput,
    performedByUserId?: string,
  ) {
    return studentFeeRepository.create(
      schoolId,
      input.studentEnrollmentId,
      input.feePlanId,
      performedByUserId,
    );
  },

  get(
    id: string,
    schoolId: string,
  ) {
    return studentFeeRepository.findById(
      id,
      schoolId,
    );
  },

  applyFeePlanToStudents(
  schoolId: string,
  feePlanId: string,
  performedByUserId?: string,
) {
  return studentFeeRepository.applyFeePlanToStudents(
    schoolId,
    feePlanId,
    performedByUserId,
  );
},
};

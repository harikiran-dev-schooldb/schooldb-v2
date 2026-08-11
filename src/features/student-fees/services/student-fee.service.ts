import { studentFeeRepository } from "../repositories/student-fee.repository";

import type {
  StudentFeeAssignmentInput,
} from "../schemas/student-fee.schema";

export const studentFeeService = {
  list(schoolId: string) {
    return studentFeeRepository.list(
      schoolId,
    );
  },

  async assign(
    schoolId: string,
    input: StudentFeeAssignmentInput,
  ) {
    return studentFeeRepository.create(
      schoolId,
      input.studentEnrollmentId,
      input.feePlanId,
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
};
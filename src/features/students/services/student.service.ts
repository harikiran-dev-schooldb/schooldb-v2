import { getCurrentTenant } from "@/lib/current-tenant";
import { studentRepository } from "../repositories/student.repository";

export const studentService = {
  async getAll() {
    const tenant = await getCurrentTenant();

    return studentRepository.findMany({
      schoolId: tenant.schoolId,
      active: true,
    });
  },

  async count() {
    const tenant = await getCurrentTenant();

    return studentRepository.count({
      schoolId: tenant.schoolId,
      active: true,
    });
  },
};
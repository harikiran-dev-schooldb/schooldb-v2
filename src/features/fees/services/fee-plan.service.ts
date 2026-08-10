import { feePlanRepository } from "../repositories/fee-plan.repository";
import type { FeePlanInput } from "../schemas/fee-plan.schema";

export const feePlanService = {
  list(schoolId: string) {
    return feePlanRepository.list(
      schoolId,
    );
  },

  async create(
    schoolId: string,
    input: FeePlanInput,
  ) {
    if (
      !input.appliesToAllClasses &&
      input.classIds.length === 0
    ) {
      throw new Error(
        "Select at least one class or apply the fee plan to all classes.",
      );
    }

    const existing =
      await feePlanRepository.list(
        schoolId,
      );

    const duplicate = existing.some(
      (plan) =>
        plan.academicYearId ===
          input.academicYearId &&
        plan.name.toLowerCase() ===
          input.name.toLowerCase(),
    );

    if (duplicate) {
      throw new Error(
        "A fee plan with this name already exists for this academic year.",
      );
    }

    return feePlanRepository.create(
      schoolId,
      input,
    );
  },
};
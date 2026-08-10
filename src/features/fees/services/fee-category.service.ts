import { feeCategoryRepository } from "../repositories/fee-category.repository";
import type { FeeCategoryInput } from "../schemas/fee-category.schema";

export const feeCategoryService = {
  list(schoolId: string) {
    return feeCategoryRepository.list(
      schoolId,
    );
  },

  async create(
    schoolId: string,
    input: FeeCategoryInput,
  ) {
    const existing =
      await feeCategoryRepository.list(
        schoolId,
      );

    const duplicate = existing.some(
      (category) =>
        category.name.toLowerCase() ===
        input.name.toLowerCase(),
    );

    if (duplicate) {
      throw new Error(
        "Fee category already exists.",
      );
    }

    return feeCategoryRepository.create(
      schoolId,
      input,
    );
  },
};
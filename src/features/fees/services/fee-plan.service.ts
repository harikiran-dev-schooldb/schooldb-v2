import { feePlanRepository } from "../repositories/fee-plan.repository";
import type { FeePlanInput } from "../schemas/fee-plan.schema";

export const feePlanService = {
  list(schoolId: string) {
    return feePlanRepository.list(
      schoolId,
    );
  },

  findById(
    id: string,
    schoolId: string,
  ) {
    return feePlanRepository.findById(
      id,
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

  async update(
  id: string,
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
    await feePlanRepository.findById(
      id,
      schoolId,
    );

  if (!existing) {
    throw new Error("Fee plan not found.");
  }

  /*
   * Once installments exist, the financial structure
   * of the fee plan becomes immutable.
   */
  const hasGeneratedInstallments =
    existing.items.some(
      (item) =>
        (item._count?.installments ?? 0) > 0,
    );

  if (hasGeneratedInstallments) {
    // Academic year cannot change
    if (
      input.academicYearId !==
      existing.academicYearId
    ) {
      throw new Error(
        "Academic year cannot be changed after installments have been generated.",
      );
    }

    /*
     * Compare the fee structure.
     * Order is ignored so the comparison is stable.
     */
    const existingItems =
      existing.items
        .map((item) => ({
          feeCategoryId:
            item.feeCategoryId,
          frequency: item.frequency,
          amount: item.amount.toString(),
          mandatory: item.mandatory,
        }))
        .sort((a, b) =>
          `${a.feeCategoryId}-${a.frequency}-${a.amount}`
            .localeCompare(
              `${b.feeCategoryId}-${b.frequency}-${b.amount}`,
            ),
        );

    const incomingItems =
      input.items
        .map((item) => ({
          feeCategoryId:
            item.feeCategoryId,
          frequency: item.frequency,
          amount: String(item.amount),
          mandatory:
            item.mandatory ?? true,
        }))
        .sort((a, b) =>
          `${a.feeCategoryId}-${a.frequency}-${a.amount}`
            .localeCompare(
              `${b.feeCategoryId}-${b.frequency}-${b.amount}`,
            ),
        );

    const structureChanged =
      JSON.stringify(existingItems) !==
      JSON.stringify(incomingItems);

    if (structureChanged) {
      throw new Error(
        "This fee plan already has generated installments. Fee category, frequency, amount, and mandatory status cannot be changed. Create a new fee plan instead.",
      );
    }
  }

  const plans =
    await feePlanRepository.list(
      schoolId,
    );

  const duplicate = plans.some(
    (plan) =>
      plan.id !== id &&
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

  return feePlanRepository.update(
    id,
    schoolId,
    input,
  );
},
};
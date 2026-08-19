"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  feePlanSchema,
  FeePlanInput,
  FeePlanFormValues,
} from "../schemas/fee-plan.schema";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";

type AcademicYear = {
  id: string;
  name: string;
};

type SchoolClass = {
  id: string;
  name: string;
};

type FeeCategory = {
  id: string;
  name: string;
  active: boolean;
};

type Props = {
  mode: "create" | "edit";
  feePlanId?: string;
  onSuccess: () => void;
};

type CustomInstallment = {
  name: string;
  amount: number;
  dueDate: string;
  sequence: number;
  periodStart: string;
  periodEnd: string;
};

const frequencies = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "TERMLY", label: "Termly" },
  { value: "HALF_YEARLY", label: "Half-yearly" },
  { value: "ANNUAL", label: "Annual" },
  { value: "CUSTOM", label: "Custom" },
] as const;

const defaultValues: FeePlanFormValues = {
  academicYearId: "",
  name: "",
  description: "",
  appliesToAllClasses: false,
  classIds: [],
  items: [
    {
      feeCategoryId: "",
      frequency: "MONTHLY",
      amount: 0,
      mandatory: true,
    },
  ],
};

export function FeePlanForm({ mode, feePlanId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);

  const [hasGeneratedInstallments, setHasGeneratedInstallments] =
    useState(false);

  const [customInstallments, setCustomInstallments] = useState<
    Record<number, CustomInstallment[]>
  >({});

  const form = useForm<FeePlanFormValues, unknown, FeePlanInput>({
    resolver: zodResolver(feePlanSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  /*
   * React Compiler-safe form subscriptions.
   * Do not use form.watch().
   */
  const appliesToAllClasses = useWatch({
    control: form.control,
    name: "appliesToAllClasses",
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  });

  /*
   * Load dropdown data.
   */
  useEffect(() => {
    async function loadData() {
      try {
        const [academicYearResponse, classResponse, categoryResponse] =
          await Promise.all([
            fetch("/api/v1/academic-years"),
            fetch("/api/v1/classes"),
            fetch("/api/v1/fee-categories"),
          ]);

        const [academicYearResult, classResult, categoryResult] =
          await Promise.all([
            academicYearResponse.json(),
            classResponse.json(),
            categoryResponse.json(),
          ]);

        if (academicYearResult.success) {
          setAcademicYears(academicYearResult.data?.data ?? []);
        }

        if (classResult.success) {
          setClasses(classResult.data?.data ?? []);
        }

        if (categoryResult.success) {
          setFeeCategories(
            (categoryResult.data ?? []).filter(
              (category: FeeCategory) => category.active,
            ),
          );
        }
      } catch {
        toast.error("Failed to load fee plan data.");
      }
    }

    void loadData();
  }, []);

  /*
   * Load existing fee plan in edit mode.
   */
  useEffect(() => {
    if (mode !== "edit" || !feePlanId) {
      return;
    }

    async function loadPlan() {
      try {
        const response = await fetch(`/api/v1/fee-plans/${feePlanId}`);

        const result = await response.json();

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        const plan = result.data;

        const hasInstallments =
          plan.items?.some(
            (item: {
              _count?: {
                installments: number;
              };
            }) => (item._count?.installments ?? 0) > 0,
          ) ?? false;

        setHasGeneratedInstallments(hasInstallments);

        form.reset({
          academicYearId: plan.academicYearId,
          name: plan.name,
          description: plan.description ?? "",
          appliesToAllClasses: plan.appliesToAllClasses,
          classIds:
            plan.classes?.map((item: { classId: string }) => item.classId) ??
            [],
          items:
            plan.items?.map(
              (item: {
                feeCategoryId: string;
                frequency: FeePlanInput["items"][number]["frequency"];
                amount: string | number;
                mandatory: boolean;
              }) => ({
                feeCategoryId: item.feeCategoryId,
                frequency: item.frequency,
                amount: Number(item.amount),
                mandatory: item.mandatory,
              }),
            ) ?? [],
        });
      } catch {
        toast.error("Failed to load fee plan.");
      }
    }

    void loadPlan();
  }, [mode, feePlanId, form]);

  function getCustomInstallments(index: number): CustomInstallment[] {
    return customInstallments[index] ?? [];
  }

  /*
   * Add custom installment.
   */
  function addCustomInstallment(itemIndex: number) {
    setCustomInstallments((current) => {
      const existing = current[itemIndex] ?? [];

      const sequence = existing.length + 1;

      return {
        ...current,
        [itemIndex]: [
          ...existing,
          {
            name: "",
            amount: 0,
            dueDate: "",
            sequence,
            periodStart: "",
            periodEnd: "",
          },
        ],
      };
    });
  }

  /*
   * Remove custom installment.
   *
   * Calculate the new total first and then
   * update the React Hook Form value.
   */
  function removeCustomInstallment(
    itemIndex: number,
    installmentIndex: number,
  ) {
    const existing = customInstallments[itemIndex] ?? [];

    const updated = existing
      .filter((_, index) => index !== installmentIndex)
      .map((item, index) => ({
        ...item,
        sequence: index + 1,
      }));

    const total = updated.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    form.setValue(`items.${itemIndex}.amount`, total, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setCustomInstallments((current) => ({
      ...current,
      [itemIndex]: updated,
    }));
  }

  /*
   * Update custom installment.
   *
   * Do not call form.setValue() inside the
   * setCustomInstallments updater.
   */
  function updateCustomInstallment(
    itemIndex: number,
    installmentIndex: number,
    field: keyof CustomInstallment,
    value: string | number,
  ) {
    const existing = customInstallments[itemIndex] ?? [];

    const updated = existing.map((item, index) =>
      index === installmentIndex
        ? {
            ...item,
            [field]: value,
          }
        : item,
    );

    const total = updated.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    form.setValue(`items.${itemIndex}.amount`, total, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setCustomInstallments((current) => ({
      ...current,
      [itemIndex]: updated,
    }));
  }

  /*
   * Remove fee item and its related
   * custom installment data.
   */
  function removeFeeItem(itemIndex: number) {
    remove(itemIndex);

    setCustomInstallments((current) => {
      const updated: Record<number, CustomInstallment[]> = {};

      Object.entries(current).forEach(([key, installments]) => {
        const index = Number(key);

        if (index < itemIndex) {
          updated[index] = installments;
        }

        if (index > itemIndex) {
          updated[index - 1] = installments;
        }
      });

      return updated;
    });
  }

  /*
   * Validate custom installments before
   * creating the fee plan.
   */
  function validateCustomInstallments(values: FeePlanInput): boolean {
    for (let index = 0; index < values.items.length; index++) {
      const item = values.items[index];

      if (item.frequency !== "CUSTOM") {
        continue;
      }

      const installments = getCustomInstallments(index);

      if (installments.length === 0) {
        toast.error("Add at least one custom installment.");

        return false;
      }

      const invalidInstallment = installments.find(
        (installment) =>
          !installment.name.trim() ||
          installment.amount <= 0 ||
          !installment.dueDate ||
          !installment.periodStart ||
          !installment.periodEnd,
      );

      if (invalidInstallment) {
        toast.error("Complete all custom installment fields.");

        return false;
      }
    }

    return true;
  }

  async function onSubmit(values: FeePlanInput) {
    try {
      if (!validateCustomInstallments(values)) {
        return;
      }

      setLoading(true);

      const url =
        mode === "create"
          ? "/api/v1/fee-plans"
          : `/api/v1/fee-plans/${feePlanId}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || "Failed to save fee plan.");

        return;
      }

      /*
       * Save custom installments after
       * creating the fee plan.
       */
      if (mode === "create") {
        const createdPlan = result.data;

        const createdItems = createdPlan?.items ?? [];

        for (let index = 0; index < values.items.length; index++) {
          const item = values.items[index];

          if (item.frequency !== "CUSTOM") {
            continue;
          }

          const installments = getCustomInstallments(index);

          const createdItem = createdItems[index];

          if (!createdItem?.id) {
            toast.error("Fee plan item was not returned by the server.");

            return;
          }

          const installmentResponse = await fetch(
            `/api/v1/fee-plan-items/${createdItem.id}/custom-installments`,
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                installments,
              }),
            },
          );

          const installmentResult = await installmentResponse.json();

          if (!installmentResult.success) {
            toast.error(
              installmentResult.message ||
                "Failed to create custom installments.",
            );

            return;
          }
        }
      }

      toast.success(
        mode === "create" ? "Fee plan created." : "Fee plan updated.",
      );

      onSuccess();
    } catch {
      toast.error("Failed to save fee plan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Academic Year */}

      <div className="space-y-2">
        <label className="text-sm font-medium">Academic Year</label>

        <select
          disabled={mode === "edit"}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          {...form.register("academicYearId")}
        >
          <option value="">Select academic year</option>

          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </div>

      {/* Name */}

      <div className="space-y-2">
        <label className="text-sm font-medium">Fee Plan Name</label>

        <Input placeholder="LKG Fee Plan 2026-27" {...form.register("name")} />
      </div>

      {/* Description */}

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>

        <Textarea
          placeholder="Describe this fee plan..."
          {...form.register("description")}
        />
      </div>

      {/* Classes */}

      <div className="space-y-3">
        <label className="text-sm font-medium">Classes</label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("appliesToAllClasses")} />
          Apply to all classes
        </label>

        {!appliesToAllClasses && (
          <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
            {classes.map((schoolClass) => (
              <label
                key={schoolClass.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  value={schoolClass.id}
                  {...form.register("classIds")}
                />

                {schoolClass.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Locked Notice */}

      {mode === "edit" && hasGeneratedInstallments && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p className="font-medium">🔒 Fee structure locked</p>

          <p className="mt-1 text-muted-foreground">
            Installments have already been generated for this fee plan. Fee
            category, frequency, amount, and mandatory status cannot be changed.
          </p>
        </div>
      )}

      {/* Fee Items */}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Fee Items</h3>

          <Button
            type="button"
            variant="outline"
            disabled={hasGeneratedInstallments}
            onClick={() =>
              append({
                feeCategoryId: "",
                frequency: "MONTHLY",
                amount: 0,
                mandatory: true,
              })
            }
          >
            Add Fee Item
          </Button>
        </div>

        {fields.map((field, index) => {
          const frequency = watchedItems?.[index]?.frequency;

          const installments = getCustomInstallments(index);

          return (
            <div key={field.id} className="space-y-4 rounded-lg border p-4">
              {/* Category */}

              <div className="space-y-2">
                <label className="text-sm font-medium">Fee Category</label>

                <select
                  disabled={hasGeneratedInstallments}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  {...form.register(`items.${index}.feeCategoryId`)}
                >
                  <option value="">Select category</option>

                  {feeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency */}

              <div className="space-y-2">
                <label className="text-sm font-medium">Frequency</label>

                <select
                  disabled={hasGeneratedInstallments}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  {...form.register(`items.${index}.frequency`)}
                >
                  {frequencies.map((frequencyOption) => (
                    <option
                      key={frequencyOption.value}
                      value={frequencyOption.value}
                    >
                      {frequencyOption.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Standard Amount */}

              {frequency !== "CUSTOM" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={hasGeneratedInstallments}
                    {...form.register(`items.${index}.amount`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              )}

              {/* Termly */}

              {frequency === "TERMLY" && (
                <div className="rounded-md border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Termly Installments</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Four installments will be generated automatically for the
                    academic year.
                  </p>

                  <div className="mt-3 space-y-1 text-sm">
                    <p>Term 1</p>
                    <p>Term 2</p>
                    <p>Term 3</p>
                    <p>Term 4</p>
                  </div>
                </div>
              )}

              {/* Custom Installments */}

              {frequency === "CUSTOM" && (
                <div className="space-y-4 rounded-md border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Custom Installments</p>

                      <p className="text-xs text-muted-foreground">
                        Define your own payment schedule.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={hasGeneratedInstallments}
                      onClick={() => addCustomInstallment(index)}
                    >
                      Add Installment
                    </Button>
                  </div>

                  {installments.map((installment, installmentIndex) => (
                    <div
                      key={`${field.id}-${installmentIndex}`}
                      className="space-y-3 rounded-md border bg-background p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          Installment {installment.sequence}
                        </p>

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={hasGeneratedInstallments}
                          onClick={() =>
                            removeCustomInstallment(index, installmentIndex)
                          }
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Name</label>

                          <Input
                            placeholder="April Fee"
                            disabled={hasGeneratedInstallments}
                            value={installment.name}
                            onChange={(event) =>
                              updateCustomInstallment(
                                index,
                                installmentIndex,
                                "name",
                                event.target.value,
                              )
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium">Amount</label>

                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="10000"
                            disabled={hasGeneratedInstallments}
                            value={installment.amount || ""}
                            onChange={(event) =>
                              updateCustomInstallment(
                                index,
                                installmentIndex,
                                "amount",
                                Number(event.target.value),
                              )
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium">
                            Due Date
                          </label>

                          <Input
                            type="date"
                            disabled={hasGeneratedInstallments}
                            value={installment.dueDate}
                            onChange={(event) =>
                              updateCustomInstallment(
                                index,
                                installmentIndex,
                                "dueDate",
                                event.target.value,
                              )
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium">
                            Period Start
                          </label>

                          <Input
                            type="date"
                            disabled={hasGeneratedInstallments}
                            value={installment.periodStart}
                            onChange={(event) =>
                              updateCustomInstallment(
                                index,
                                installmentIndex,
                                "periodStart",
                                event.target.value,
                              )
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium">
                            Period End
                          </label>

                          <Input
                            type="date"
                            disabled={hasGeneratedInstallments}
                            value={installment.periodEnd}
                            onChange={(event) =>
                              updateCustomInstallment(
                                index,
                                installmentIndex,
                                "periodEnd",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {installments.length === 0 && (
                    <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                      No custom installments added.
                    </div>
                  )}
                </div>
              )}

              {/* Mandatory */}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={hasGeneratedInstallments}
                  {...form.register(`items.${index}.mandatory`)}
                />
                Mandatory
              </label>

              {/* Remove Fee Item */}

              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={hasGeneratedInstallments}
                  onClick={() => removeFeeItem(index)}
                >
                  Remove
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation Error */}

      {Object.keys(form.formState.errors).length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Please complete all required fields.
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? "Saving..."
          : mode === "create"
            ? "Create Fee Plan"
            : "Update Fee Plan"}
      </Button>
    </form>
  );
}

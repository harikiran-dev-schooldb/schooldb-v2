import { z } from "zod";

export const createExamSchema = z
  .object({
    academicYearId: z
      .string()
      .min(1, "Academic year is required."),

    name: z
      .string()
      .trim()
      .min(1, "Exam name is required.")
      .max(100, "Exam name is too long."),

    startDate: z
      .string()
      .min(1, "Start date is required."),

    endDate: z
      .string()
      .min(1, "End date is required."),
  })
  .refine(
    (data) => {
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message:
        "End date must be on or after the start date.",
      path: ["endDate"],
    },
  );

export const updateExamSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Exam name is required.")
      .max(100, "Exam name is too long.")
      .optional(),

    startDate: z
      .string()
      .min(1, "Start date is required.")
      .optional(),

    endDate: z
      .string()
      .min(1, "End date is required.")
      .optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) {
        return true;
      }

      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message:
        "End date must be on or after the start date.",
      path: ["endDate"],
    },
  );

export type CreateExamInput = z.infer<
  typeof createExamSchema
>;

export type UpdateExamInput = z.infer<
  typeof updateExamSchema
>;
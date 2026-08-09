import { z } from "zod";

export const homeworkSchema = z.object({
  classId: z
    .string()
    .min(1, "Class is required."),

  sectionId: z
  .string()
  .optional()
  .or(z.literal("")),

  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or less.")
    .default("Today's Homework"),

  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or less.")
    .optional()
    .or(z.literal("")),

  assignedDate: z
    .string()
    .optional()
    .or(z.literal("")),

  dueDate: z
    .string()
    .optional()
    .or(z.literal("")),

  active: z
    .boolean()
    .default(true),
});

export type HomeworkFormInput =
  z.input<typeof homeworkSchema>;

export type HomeworkFormOutput =
  z.output<typeof homeworkSchema>;
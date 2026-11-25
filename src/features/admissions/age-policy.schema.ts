import { z } from "zod";
import { validCalendarDate } from "./age-policy";

const rule = z.object({
  minMonths: z.number().int().min(0).max(240),
  maxMonths: z.number().int().min(0).max(240),
}).strict().refine((value) => value.minMonths <= value.maxMonths, "Maximum age must not be below minimum age.");

export const admissionAgePolicySchema = z.object({
  ageAsOfDate: z.string().refine(validCalendarDate, "Enter a valid cutoff date."),
  rules: z.record(z.string().cuid(), rule),
}).strict();

export const saveAdmissionAgePolicySchema = z.object({
  academicYearId: z.string().cuid(),
  policy: admissionAgePolicySchema,
}).strict();

export function readAdmissionAgePolicy(value: unknown) {
  const result = admissionAgePolicySchema.safeParse(value);
  return result.success ? result.data : null;
}

import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Enter a valid date.");

export const bulkStudentRowSchema = z.object({
  admissionNo: z.string().trim().min(1),
  fullName: z.string().trim().min(3),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: isoDate,
  phone: z.string().trim().min(1),
  email: z.string().email().or(z.literal("")),
  status: z.enum([
    "ACTIVE",
    "INACTIVE",
    "TC_ISSUED",
    "DROPPED",
    "ALUMNI",
    "NOT_COMING",
  ]),
});

export const bulkStudentsSchema = z.object({
  students: z.array(bulkStudentRowSchema).min(1).max(500),
});

export type BulkStudentRow = z.infer<typeof bulkStudentRowSchema>;

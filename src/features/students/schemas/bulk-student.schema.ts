import { z } from "zod";

export const bulkStudentRowSchema = z.object({
  admissionNo: z.string().trim().min(1),
  fullName: z.string().trim().min(3),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

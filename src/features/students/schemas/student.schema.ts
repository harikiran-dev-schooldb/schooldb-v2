import { z } from "zod";

export const createStudentSchema = z.object({
  admissionNo: z.string().min(1),
  fullName: z.string().min(3),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  status: z.enum([
    "ACTIVE",
    "INACTIVE",
    "TRANSFERRED",
    "DROPPED",
    "ALUMNI",
  ]),
});

export type StudentFormInput = z.input<typeof createStudentSchema>;
export type StudentFormOutput = z.output<typeof createStudentSchema>;
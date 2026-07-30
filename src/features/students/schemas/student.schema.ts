import { z } from "zod";

export const createStudentSchema = z.object({
  admissionNo: z.string().min(1, "Admission No is required"),

  fullName: z.string().min(3, "Student name is required"),

  gender: z.enum(["MALE", "FEMALE", "OTHER"]),

  dob: z.coerce.date(),

  phone: z.string().optional(),

  email: z.string().email().optional().or(z.literal("")),

  status: z
    .enum([
      "ACTIVE",
      "INACTIVE",
      "TRANSFERRED",
      "DROPPED",
      "ALUMNI",
    ])
    .default("ACTIVE"),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
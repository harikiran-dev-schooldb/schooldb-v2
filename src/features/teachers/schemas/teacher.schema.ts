import { z } from "zod";

export const teacherSchema = z.object({
  employeeId: z
    .string()
    .trim()
    .min(1, "Employee ID is required."),

  fullName: z
    .string()
    .trim()
    .min(3, "Teacher name is required."),

  gender: z.enum([
    "MALE",
    "FEMALE",
    "OTHER",
  ]),

  dob: z.string().optional().or(z.literal("")),

  joiningDate: z
    .string()
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),

  email: z
    .string()
    .email()
    .optional()
    .or(z.literal("")),

  qualification: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),

  designation: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),

  active: z.boolean().default(true),

  studentDetailsAccess: z.boolean().default(true),
  feeAccess: z.boolean().default(true),
  resultAccess: z.boolean().default(true),
  timetableAccess: z.boolean().default(true),
  attendanceAccess: z.boolean().default(true),
  homeworkAccess: z.boolean().default(true),
  examAccess: z.boolean().default(true),
  marksEntryAccess: z.boolean().default(true),
});

export type TeacherFormInput = z.input<
  typeof teacherSchema
>;

export type TeacherFormOutput = z.output<
  typeof teacherSchema
>;

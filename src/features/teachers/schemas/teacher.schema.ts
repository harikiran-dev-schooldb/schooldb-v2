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

  studentDetailsAccess: z.boolean().default(false),
  feeAccess: z.boolean().default(false),
  resultAccess: z.boolean().default(false),
  timetableAccess: z.boolean().default(false),
  attendanceAccess: z.boolean().default(false),
  homeworkAccess: z.boolean().default(false),
  examAccess: z.boolean().default(false),
  marksEntryAccess: z.boolean().default(false),
});

export type TeacherFormInput = z.input<
  typeof teacherSchema
>;

export type TeacherFormOutput = z.output<
  typeof teacherSchema
>;

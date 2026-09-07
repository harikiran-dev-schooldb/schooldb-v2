import { z } from "zod";

const nullableText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((value) => value || null);

const optionalNullableText = (max = 255) =>
  nullableText(max)
    .optional()
    .transform((value) => value ?? null);

const nullableEmail = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Enter a valid email address.",
  )
  .transform((value) => value || null);

const nullableIncome = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.union([z.coerce.number().nonnegative("Income cannot be negative."), z.null()]),
);

const optionalDate = z
  .string()
  .refine(
    (value) => value === "" || !Number.isNaN(Date.parse(`${value}T00:00:00`)),
    "Enter a valid date.",
  )
  .transform((value) => value || null);

export const createStudentSchema = z.object({
  admissionNo: z.string().trim().min(1, "Admission number is required."),
  fullName: nullableText(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z
    .string()
    .min(1, "Date of birth is required.")
    .refine(
      (value) => !Number.isNaN(Date.parse(`${value}T00:00:00`)),
      "Enter a valid date.",
    ),
  joinedDate: optionalDate,
  phone: nullableText(30),
  alternatePhone: nullableText(30),
  email: nullableEmail,
  imageUrl: optionalNullableText(2048),
  status: z.enum([
    "ACTIVE",
    "INACTIVE",
    "TC_ISSUED",
    "DROPPED",
    "ALUMNI",
    "NOT_COMING",
  ]),

  studentAadhar: optionalNullableText(30),
  apaarId: optionalNullableText(100),
  penNo: nullableText(100),
  emisNo: optionalNullableText(100),
  bloodGroup: nullableText(20),
  nationality: nullableText(100),
  motherTongue: nullableText(100),
  religion: z
    .enum([
      "HINDU",
      "MUSLIM",
      "CHRISTIAN",
      "SIKH",
      "BUDDHIST",
      "JAIN",
      "OTHER",
    ])
    .nullable(),
  category: z
    .enum([
      "GENERAL",
      "OBC",
      "BC_A",
      "BC_B",
      "BC_C",
      "BC_D",
      "BC_E",
      "SC",
      "ST",
      "EWS",
      "RTE",
    ])
    .nullable(),
  caste: nullableText(100),
  subCaste: nullableText(100),

  address: nullableText(1000),
  city: nullableText(100),
  district: nullableText(100),
  state: nullableText(100),
  pincode: nullableText(20),
  country: nullableText(100),

  fatherName: nullableText(),
  fatherPhone: nullableText(30),
  fatherEmail: nullableEmail,
  fatherAadhar: optionalNullableText(30),
  fatherOccupation: nullableText(),
  fatherQualification: nullableText(),
  fatherIncome: nullableIncome,

  motherName: nullableText(),
  motherPhone: nullableText(30),
  motherEmail: nullableEmail,
  motherAadhar: optionalNullableText(30),
  motherOccupation: nullableText(),
  motherQualification: nullableText(),
  motherIncome: nullableIncome,

  guardianName: optionalNullableText(),
  guardianPhone: optionalNullableText(30),
  guardianRelation: optionalNullableText(100),

  doctorName: optionalNullableText(),
  doctorPhone: optionalNullableText(30),
  medicalConditions: optionalNullableText(1000),
  allergies: optionalNullableText(1000),
  hostelRequired: z.boolean().optional().default(false),
  transportRequired: z.boolean().optional().default(false),
  whatsappOptIn: z.boolean().optional().default(false),
  remarks: optionalNullableText(2000),
});

export type StudentFormInput = z.input<typeof createStudentSchema>;
export type StudentFormOutput = z.output<typeof createStudentSchema>;

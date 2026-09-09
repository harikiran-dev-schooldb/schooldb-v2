import { z } from "zod";

const optionalText = (max = 255) =>
  z.string().trim().max(max).optional().transform((value) => value || null);

const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value === "" || value.length === 10, "Enter a 10-digit mobile number.")
  .transform((value) => value || null);

export const publicAdmissionSchema = z
  .object({
    academicYearId: z.string().cuid(),
    applyingClassId: z.string().cuid(),
    preferredSectionId: optionalText(),
    studentName: z.string().trim().min(2, "Student name is required.").max(255),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    dob: z.string().date(),
    studentAadhar: optionalText(12).refine(
      (value) => !value || /^\d{12}$/.test(value),
      "Aadhaar must contain 12 digits.",
    ),
    apaarId: optionalText(100),
    previousSchool: optionalText(255),
    fatherName: optionalText(),
    fatherPhone: phone,
    motherName: optionalText(),
    motherPhone: phone,
    guardianName: optionalText(),
    guardianPhone: phone,
    guardianRelation: optionalText(100),
    email: z.string().trim().email("Enter a valid email.").or(z.literal("")).transform((value) => value || null),
    address: optionalText(1000),
    city: optionalText(100),
    district: optionalText(100),
    state: optionalText(100),
    pincode: optionalText(10),
    medicalConditions: optionalText(1000),
    transportRequired: z.boolean().default(false),
    whatsappOptIn: z.literal(true, { error: "Consent is required to submit the application." }),
    website: z.string().max(0).optional(),
  })
  .superRefine((input, context) => {
    const contacts = [
      [input.fatherName, input.fatherPhone],
      [input.motherName, input.motherPhone],
      [input.guardianName, input.guardianPhone],
    ];
    if (!contacts.some(([name, mobile]) => name && mobile)) {
      context.addIssue({ code: "custom", path: ["fatherPhone"], message: "Provide at least one parent or guardian name and mobile number." });
    }
  });

export const admissionStatusSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "WAITLISTED", "REJECTED"]),
  note: z.string().trim().max(2000).optional().transform((value) => value || null),
});

export const convertAdmissionSchema = z.object({
  admissionNo: z.string().trim().max(50),
  sectionId: z.string().cuid(),
  rollNo: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable(),
  ),
});

export const trackAdmissionSchema = z.object({
  applicationNo: z.string().trim().min(6).max(50).transform((value) => value.toUpperCase()),
  mobile: z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 10, "Enter a 10-digit mobile number."),
});

export const admissionSettingSchema = z.object({
  automaticNumbering: z.boolean(),
  admissionPrefix: z.string().trim().max(20).transform((value) => value.toUpperCase()),
  nextNumber: z.coerce.number().int().positive().max(99_999_999),
  numberPadding: z.coerce.number().int().min(1).max(10),
});

export type PublicAdmissionInput = z.output<typeof publicAdmissionSchema>;

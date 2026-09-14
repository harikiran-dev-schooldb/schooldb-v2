import { z } from "zod";

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizeBulkStudentDate(value: string) {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (iso) {
    const [, year, month, day] = iso;
    return validDate(Number(year), Number(month), Number(day))
      ? `${year}-${month}-${day}`
      : null;
  }

  const dayFirst = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(
    trimmed,
  );
  if (!dayFirst) return null;

  const [, rawDay, rawMonth, rawYear] = dayFirst;
  const year =
    rawYear.length === 2
      ? Number(rawYear) >= 50
        ? 1900 + Number(rawYear)
        : 2000 + Number(rawYear)
      : Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);

  if (!validDate(year, month, day)) return null;

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const flexibleDate = z.string().trim().transform((value, context) => {
  const normalized = normalizeBulkStudentDate(value);
  if (normalized) return normalized;

  context.addIssue({
    code: "custom",
    message: "Use YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY; 2-digit years are also accepted.",
  });
  return z.NEVER;
});

const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((value) => value || null)
    .default(null);

const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Enter a valid email address.",
  )
  .transform((value) => value || null)
  .default(null);

const optionalDate = z
  .string()
  .trim()
  .transform((value, context) => {
    if (value === "") return null;
    const normalized = normalizeBulkStudentDate(value);
    if (normalized) return normalized;

    context.addIssue({
      code: "custom",
      message: "Use YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY; 2-digit years are also accepted.",
    });
    return z.NEVER;
  })
  .default(null);

const optionalIncome = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0),
    "Income must be a non-negative number.",
  )
  .transform((value) => (value === "" ? null : Number(value)))
  .default(null);

const optionalPositiveInteger = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0),
    "Must be a positive integer.",
  )
  .transform((value) => (value === "" ? null : Number(value)))
  .default(null);

const optionalBoolean = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(
    (value) =>
      ["", "TRUE", "FALSE", "YES", "NO", "1", "0"].includes(value),
    "Use TRUE/FALSE, YES/NO, or 1/0.",
  )
  .transform((value) => ["TRUE", "YES", "1"].includes(value))
  .default(false);

const optionalEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || values.includes(value), {
      message: `Use one of: ${values.join(", ")}.`,
    })
    .transform((value) => (value === "" ? null : (value as T[number])))
    .default(null);

export const bulkStudentRowSchema = z
  .object({
    admissionNo: z.string().trim().min(1),
    fullName: z.string().trim().min(3),
    gender: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.enum(["MALE", "FEMALE", "OTHER"])),
    dob: flexibleDate,
    status: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(
        z.enum([
          "ACTIVE",
          "INACTIVE",
          "TC_ISSUED",
          "DROPPED",
          "ALUMNI",
          "NOT_COMING",
        ]),
      ),
    academicYear: optionalText(100),
    className: optionalText(100),
    sectionName: optionalText(100),
    rollNo: optionalPositiveInteger,
    joinedDate: optionalDate,
    phone: optionalText(30),
    alternatePhone: optionalText(30),
    email: optionalEmail,
    imageUrl: optionalText(2048).pipe(z.url().nullable()),
    studentAadhar: optionalText(30),
    apaarId: optionalText(100),
    penNo: optionalText(100),
    emisNo: optionalText(100),
    bloodGroup: optionalText(20),
    nationality: optionalText(100),
    motherTongue: optionalText(100),
    religion: optionalEnum([
      "HINDU",
      "MUSLIM",
      "CHRISTIAN",
      "SIKH",
      "BUDDHIST",
      "JAIN",
      "OTHER",
    ]),
    category: optionalEnum([
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
    ]),
    caste: optionalText(100),
    subCaste: optionalText(100),
    address: optionalText(1000),
    city: optionalText(100),
    district: optionalText(100),
    state: optionalText(100),
    pincode: optionalText(20),
    country: optionalText(100),
    fatherName: optionalText(),
    fatherPhone: optionalText(30),
    fatherEmail: optionalEmail,
    fatherAadhar: optionalText(30),
    fatherOccupation: optionalText(),
    fatherQualification: optionalText(),
    fatherIncome: optionalIncome,
    motherName: optionalText(),
    motherPhone: optionalText(30),
    motherEmail: optionalEmail,
    motherAadhar: optionalText(30),
    motherOccupation: optionalText(),
    motherQualification: optionalText(),
    motherIncome: optionalIncome,
    guardianName: optionalText(),
    guardianPhone: optionalText(30),
    guardianRelation: optionalText(100),
    doctorName: optionalText(),
    doctorPhone: optionalText(30),
    medicalConditions: optionalText(1000),
    allergies: optionalText(1000),
    hostelRequired: optionalBoolean,
    transportRequired: optionalBoolean,
    whatsappOptIn: optionalBoolean,
    remarks: optionalText(2000),
  })
  .superRefine((student, context) => {
    const enrollmentValues = [
      student.academicYear,
      student.className,
      student.sectionName,
      student.rollNo,
    ];

    if (!enrollmentValues.some((value) => value !== null)) return;

    for (const field of ["academicYear", "className", "sectionName"] as const) {
      if (!student[field]) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Required when enrollment details are provided.",
        });
      }
    }
  });

export const bulkStudentsSchema = z.object({
  students: z.array(bulkStudentRowSchema).min(1).max(500),
});

export type BulkStudentRow = z.infer<typeof bulkStudentRowSchema>;

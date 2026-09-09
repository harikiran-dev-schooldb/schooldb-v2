export const DEFAULT_CERTIFICATE_SETTING = {
  headerSubtitle: "SchoolDB · Official record",
  bonafideContent: "This is to certify that {{studentName}}, child/ward of {{parentName}}, bearing Admission No. {{admissionNo}}, is a bonafide student of {{schoolName}}.\n\nThe student is studying in {{className}} during the academic year {{academicYear}}. Date of birth as recorded in the school register is {{dateOfBirth}}.\n\nThis certificate is issued upon request for official purposes.",
  studyContent: "This is to certify that {{studentName}}, child/ward of {{parentName}}, bearing Admission No. {{admissionNo}}, is studying in {{className}} at {{schoolName}} during the academic year {{academicYear}}.\n\nThe student's date of birth as recorded in the school register is {{dateOfBirth}}.\n\nThis certificate is issued upon request for official purposes.",
  transferContent: "This is to certify that {{studentName}}, child/ward of {{parentName}}, bearing Admission No. {{admissionNo}}, was a student of {{schoolName}}.\n\nThe student attended {{className}} during the academic year {{academicYear}}. Date of admission: {{joinedDate}}. Date of leaving: {{leavingDate}}.\n\nReason / remarks: {{remarks}}. We wish the student success in future studies.",
  footerNote: null,
  signatoryLabel: "Principal / Head of School",
} as const;

export const CERTIFICATE_PLACEHOLDERS = [
  "studentName",
  "parentName",
  "admissionNo",
  "schoolName",
  "className",
  "academicYear",
  "dateOfBirth",
  "joinedDate",
  "leavingDate",
  "remarks",
] as const;

export function renderCertificateContent(template: string, values: Record<string, string>) {
  return template.replace(/\{\{([a-zA-Z]+)\}\}/g, (placeholder, key: string) => values[key] ?? placeholder);
}

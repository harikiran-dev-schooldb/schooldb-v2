export const EXAM_GRADES = ["A+", "A", "B+", "B", "C", "D", "E"] as const;

export type ExamGrade = (typeof EXAM_GRADES)[number];
export type ExamAssessmentType = "MARKS" | "GRADE";

export type AssessmentEntry = {
  status: "PRESENT" | "ABSENT" | "EXEMPTED";
  marksObtained?: unknown;
  grade?: string | null;
};

export function isAssessmentEntryMissing(
  assessmentType: ExamAssessmentType,
  entry: AssessmentEntry | null | undefined,
) {
  if (!entry) return true;
  if (entry.status !== "PRESENT") return false;
  return assessmentType === "GRADE" ? !entry.grade?.trim() : entry.marksObtained == null;
}

export function isExamGrade(value: unknown): value is ExamGrade {
  return typeof value === "string" && EXAM_GRADES.includes(value as ExamGrade);
}

export const EXAM_GRADES = ["A+", "A", "B+", "B", "C", "D", "E"] as const;

export type ExamGrade = (typeof EXAM_GRADES)[number];
export type ExamAssessmentType = "MARKS" | "GRADE";

export function isExamGrade(value: unknown): value is ExamGrade {
  return typeof value === "string" && EXAM_GRADES.includes(value as ExamGrade);
}

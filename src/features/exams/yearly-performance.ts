export type YearlyResultStatus =
  | "PASS"
  | "FAIL"
  | "PENDING"
  | "ABSENT"
  | "EXEMPTED";

export function annualGrade(percentage: number | null) {
  if (percentage === null) return "—";
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "E";
}

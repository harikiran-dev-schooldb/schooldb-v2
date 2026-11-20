export type YearlyResultStatus =
  | "PASS"
  | "FAIL"
  | "PENDING"
  | "ABSENT"
  | "EXEMPTED";

export type GradeBand = { label: string; minimumPercentage: number };

export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { label: "A+", minimumPercentage: 90 },
  { label: "A", minimumPercentage: 80 },
  { label: "B+", minimumPercentage: 70 },
  { label: "B", minimumPercentage: 60 },
  { label: "C", minimumPercentage: 50 },
  { label: "D", minimumPercentage: 40 },
  { label: "E", minimumPercentage: 0 },
];

export function annualGrade(
  percentage: number | null,
  bands: readonly GradeBand[] = DEFAULT_GRADE_BANDS,
) {
  if (percentage === null) return "—";
  return [...bands]
    .sort((a, b) => b.minimumPercentage - a.minimumPercentage)
    .find((band) => percentage >= band.minimumPercentage)?.label ?? "—";
}

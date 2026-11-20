import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { DEFAULT_GRADE_BANDS } from "./yearly-performance";

export const gradeBandSchema = z.object({
  label: z.string().trim().min(1).max(5),
  minimumPercentage: z.number().min(0).max(100),
});

export const gradingPolicySchema = z.object({
  gradeBands: z.array(gradeBandSchema).min(2).max(15),
  annualPassPercentage: z.number().min(0).max(100),
  requireAllSubjectsPass: z.boolean(),
  maximumGraceMarks: z.number().min(0).max(100),
});

export type GradeBand = z.infer<typeof gradeBandSchema>;
export type GradingPolicy = z.infer<typeof gradingPolicySchema>;

export const DEFAULT_GRADING_POLICY: GradingPolicy = {
  gradeBands: DEFAULT_GRADE_BANDS,
  annualPassPercentage: 40,
  requireAllSubjectsPass: true,
  maximumGraceMarks: 0,
};

function normalizeBands(value: unknown): GradeBand[] {
  const parsed = z.array(gradeBandSchema).safeParse(value);
  if (!parsed.success) return DEFAULT_GRADE_BANDS;
  return [...parsed.data].sort((a, b) => b.minimumPercentage - a.minimumPercentage);
}

export async function getGradingPolicy(schoolId: string): Promise<GradingPolicy> {
  const setting = await prisma.schoolAnalyticsSetting.findUnique({
    where: { schoolId },
    select: {
      annualGradeBands: true,
      annualPassPercentage: true,
      requireAllSubjectsPass: true,
      maximumGraceMarks: true,
    },
  });

  if (!setting) return DEFAULT_GRADING_POLICY;
  return {
    gradeBands: normalizeBands(setting.annualGradeBands),
    annualPassPercentage: Number(setting.annualPassPercentage),
    requireAllSubjectsPass: setting.requireAllSubjectsPass,
    maximumGraceMarks: Number(setting.maximumGraceMarks),
  };
}

export async function saveGradingPolicy(schoolId: string, value: unknown) {
  const input = gradingPolicySchema.parse(value);
  const gradeBands = [...input.gradeBands].sort(
    (a, b) => b.minimumPercentage - a.minimumPercentage,
  );
  if (new Set(gradeBands.map((band) => band.label.toUpperCase())).size !== gradeBands.length) {
    throw new Error("Grade labels must be unique.");
  }
  if (new Set(gradeBands.map((band) => band.minimumPercentage)).size !== gradeBands.length) {
    throw new Error("Grade minimum percentages must be unique.");
  }
  if (gradeBands.at(-1)?.minimumPercentage !== 0) {
    throw new Error("The final grade band must start at 0%.");
  }

  await prisma.schoolAnalyticsSetting.upsert({
    where: { schoolId },
    create: {
      schoolId,
      annualGradeBands: gradeBands,
      annualPassPercentage: input.annualPassPercentage,
      requireAllSubjectsPass: input.requireAllSubjectsPass,
      maximumGraceMarks: input.maximumGraceMarks,
    },
    update: {
      annualGradeBands: gradeBands,
      annualPassPercentage: input.annualPassPercentage,
      requireAllSubjectsPass: input.requireAllSubjectsPass,
      maximumGraceMarks: input.maximumGraceMarks,
    },
  });

  return { ...input, gradeBands };
}

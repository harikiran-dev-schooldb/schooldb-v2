import { PageContainer, PageHeader } from "@/components/common/layout";
import { GradingPolicyPage } from "@/features/exams/components/GradingPolicyPage";
import { getGradingPolicy } from "@/features/exams/grading-policy";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Page({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const [policy, exams] = await Promise.all([
    getGradingPolicy(membership.schoolId),
    prisma.exam.findMany({
      where: { schoolId: membership.schoolId, active: true, academicYear: { active: true } },
      orderBy: [{ startDate: "asc" }, { name: "asc" }],
      select: { id: true, name: true, annualWeight: true },
    }),
  ]);

  return <PageContainer><PageHeader title="Grading & annual results" description="Configure grade bands, pass rules, grace allowance and examination weightage." /><GradingPolicyPage initialPolicy={policy} initialExams={exams.map((exam) => ({ ...exam, annualWeight: Number(exam.annualWeight) }))} /></PageContainer>;
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { AddStudentEnrollmentButton } from "@/features/student-enrollments/components/AddStudentEnrollmentButton";
import { StudentEnrollmentTable } from "@/features/student-enrollments/components/StudentEnrollmentTable";

export default async function EnrollmentsPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Academic Planning"
        title="Next-Year Enrollment Planning"
        description="Start with every student enrolled in the current academic year, then review where each student should be enrolled next year."
        action={
          <>
            <AddStudentEnrollmentButton />
            <Button asChild>
              <Link href={`/${schoolSlug}/bulk-operations/student-promotion`}>
                Review and enroll students
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        }
      />

      <section className="premium-card overflow-hidden rounded-3xl bg-white p-3 md:p-5">
        <StudentEnrollmentTable />{" "}
      </section>
    </div>
  );
}

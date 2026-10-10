"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { StudentClassReport } from "@/features/students/components/StudentClassReport";

export default function StudentClassReportPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  return (
    <div className="schooldb-page-enter space-y-6 pb-10">
      <PageHeader
        eyebrow="Student reports"
        title="Class-wise student report"
        description="Review active enrollment, attendance and fee summaries by syllabus, branch, class and section."
        action={
          <Button asChild variant="outline">
            <Link href={`/${schoolSlug}/students`}>
              <ArrowLeft className="size-4" />
              Student directory
            </Link>
          </Button>
        }
      />

      <StudentClassReport />
    </div>
  );
}

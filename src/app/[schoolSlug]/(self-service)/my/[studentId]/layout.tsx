import type { ReactNode } from "react";

import { StudentContextHeader } from "@/components/self-service/StudentContextHeader";
import { requireStudentAccess } from "@/lib/student-access";

export default async function StudentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { student } = await requireStudentAccess(schoolSlug, studentId);

  return (
    <div className="space-y-7">
      <StudentContextHeader schoolSlug={schoolSlug} student={student} />
      {children}
    </div>
  );
}

import type { ReactNode } from "react";

import { SelfServiceHeader } from "@/components/self-service/SelfServiceHeader";
import { listAccessibleStudents } from "@/lib/student-access";
import { unreadNotificationCount } from "@/features/notifications/service";

export default async function SelfServiceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const { membership, students } = await listAccessibleStudents(schoolSlug);
  const unreadCount = await unreadNotificationCount(schoolSlug);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.07),transparent_32%)] bg-background">
      <SelfServiceHeader
        schoolName={membership.school.name}
        schoolSlug={schoolSlug}
        role={membership.role}
        showStudentPicker={students.length > 1}
        unreadCount={unreadCount}
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 print:max-w-none print:p-0 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}

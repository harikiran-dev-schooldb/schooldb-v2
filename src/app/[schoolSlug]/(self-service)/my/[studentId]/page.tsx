import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  ClipboardList,
  CreditCard,
  BookOpenCheck,
  CalendarDays,
  CalendarClock,
  ScrollText,
  Trophy,
  FolderLock,
  BusFront,
  LibraryBig,
} from "lucide-react";

import { SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudentAccess } from "@/lib/student-access";

const sections = [
  {
    href: "attendance",
    title: "Attendance",
    description: "Review attendance history and overall percentage.",
    icon: CalendarCheck2,
  },
  {
    href: "fees",
    title: "Fees",
    description: "See installments, payments, and outstanding balances.",
    icon: CreditCard,
  },
  {
    href: "exams",
    title: "Exams",
    description: "Check published examination dates and subjects.",
    icon: ClipboardList,
  },
  {
    href: "results",
    title: "Results",
    description: "View completed exam marks and performance.",
    icon: Trophy,
  },
  {
    href: "timetable",
    title: "Class timetable",
    description: "See the weekly subject, period, and teacher schedule.",
    icon: CalendarDays,
  },
  {
    href: "homework",
    title: "Homework",
    description: "Review current assignments and upcoming due dates.",
    icon: BookOpenCheck,
  },
  {
    href: "report-card",
    title: "Report card",
    description: "Open a polished academic summary for completed exams.",
    icon: ScrollText,
  },
  {
    href: "leave-requests",
    title: "Leave requests",
    description: "Request an absence and track the school’s decision.",
    icon: CalendarClock,
  },
  {
    href: "transport",
    title: "Transport",
    description: "See the assigned route, boarding stop and pickup timing.",
    icon: BusFront,
  },
  {
    href: "library",
    title: "My Library",
    description: "Track borrowed books, return dates and renewals.",
    icon: LibraryBig,
  },
  {
    href: "documents",
    title: "Documents",
    description: "Open secure records shared by the school.",
    icon: FolderLock,
  },
];

export default async function StudentOverviewPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; studentId: string }>;
}) {
  const { schoolSlug, studentId } = await params;
  const { enrollment } = await requireStudentAccess(schoolSlug, studentId);
  const base = `/${schoolSlug}/my/${studentId}`;

  return (
    <SelfServicePage
      title="Student overview"
      description={
        enrollment
          ? `Showing the active ${enrollment.academicYear.name} enrollment.`
          : "This student does not currently have an active enrollment."
      }
    >
      <div className="rounded-[28px] bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 p-6 text-white shadow-[0_24px_60px_rgba(79,70,229,0.2)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">Everything in one place</p>
        <h3 className="mt-3 max-w-2xl text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
          Stay on top of every school day.
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
          Academic updates, schedules, payments, and progress are organized for this student only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={`${base}/${href}`}>
            <Card className="group h-full border-white/80 bg-white/90 shadow-[0_14px_38px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_20px_45px_rgba(79,70,229,0.1)]">
              <CardHeader>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-600 ring-1 ring-indigo-100 transition-transform group-hover:scale-105">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="mt-3">{title}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-4 pt-3">
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
                <ArrowRight className="size-5 shrink-0 text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </SelfServicePage>
  );
}

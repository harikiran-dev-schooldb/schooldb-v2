"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarCheck2,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  ScrollText,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const links = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck2 },
  { href: "/fees", label: "Fees", icon: CreditCard },
  { href: "/exams", label: "Exams", icon: ClipboardList },
  { href: "/results", label: "Results", icon: Trophy },
  { href: "/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/homework", label: "Homework", icon: BookOpenCheck },
  { href: "/report-card", label: "Report card", icon: ScrollText },
  { href: "/leave-requests", label: "Leave requests", icon: CalendarClock },
];

export function StudentContextHeader({
  schoolSlug,
  student,
}: {
  schoolSlug: string;
  student: {
    id: string;
    fullName: string | null;
    admissionNo: string;
    relationship: string | null;
    enrollments: Array<{
      class: { name: string };
      section: { name: string };
      academicYear: { name: string };
    }>;
  };
}) {
  const base = `/${schoolSlug}/my/${student.id}`;
  const enrollment = student.enrollments[0];
  const pathname = usePathname();
  const initials = (student.fullName || "Student")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <div className="space-y-5 print:hidden">
      <div className="relative overflow-hidden rounded-[28px] border border-indigo-200/60 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50/80 p-5 shadow-[0_20px_60px_rgba(79,70,229,0.09)] sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-black text-white shadow-[0_10px_28px_rgba(79,70,229,0.24)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
                {student.fullName || "Student"}
              </h1>
              {student.relationship && student.relationship !== "Self" && (
                <Badge variant="outline">{student.relationship}</Badge>
              )}
            </div>
            <p className="mt-1.5 text-sm font-medium text-muted-foreground">
              Admission {student.admissionNo}
              {enrollment
                ? ` · ${enrollment.class.name} ${enrollment.section.name} · ${enrollment.academicYear.name}`
                : " · No active enrollment"}
            </p>
          </div>
        </div>

        <nav className="relative mt-6 flex gap-2 overflow-x-auto border-t border-indigo-100/80 pt-4" aria-label="Student sections">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={`${base}${href}`}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                pathname === `${base}${href}`
                  ? "border-indigo-200 bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.22)]"
                  : "border-white/80 bg-white/75 text-muted-foreground shadow-sm hover:border-indigo-200 hover:bg-white hover:text-indigo-700"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

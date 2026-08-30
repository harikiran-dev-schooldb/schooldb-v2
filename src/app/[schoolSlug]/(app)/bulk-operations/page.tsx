import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  IndianRupee,
  Layers3,
  Network,
  UserRound,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const operations = [
  {
    title: "Students",
    description:
      "Add student records in bulk with validation and duplicate checks.",
    href: "bulk-operations/students",
    icon: GraduationCap,
    status: "Ready",
  },
  {
    title: "Student Enrollment",
    description:
      "Enroll existing students into an academic year, class, section and roll number.",
    href: "bulk-operations/student-enrollments",
    icon: GraduationCap,
    status: "Ready",
  },
  {
    title: "Student Promotion",
    description:
      "Promote students from one academic year and class section to another.",
    href: "bulk-operations/student-promotion",
    icon: GraduationCap,
    status: "Ready",
  },
  {
    title: "Teachers",
    description:
      "Import teacher records with employee ID validation and duplicate checks.",
    href: "bulk-operations/teachers",
    icon: UserRound,
    status: "Ready",
  },
  {
    title: "Teacher Allocation",
    description:
      "Assign teachers to academic-year subject, class and section combinations.",
    href: "bulk-operations/teacher-allocations",
    icon: UserRound,
    status: "Ready",
  },
  {
    title: "Classes & Sections",
    description:
      "Create classes and their sections together from one validated CSV.",
    href: "bulk-operations/classes",
    icon: Users,
    status: "Ready",
  },
  {
    title: "Subjects",
    description:
      "Import subjects with type, code, ordering, and active status validation.",
    href: "bulk-operations/subjects",
    icon: Layers3,
    status: "Ready",
  },
  {
    title: "Class Subjects",
    description:
      "Map subjects to classes for an academic year with duplicate and reference validation.",
    href: "bulk-operations/class-subjects",
    icon: Network,
    status: "Ready",
  },
  {
    title: "Exams",
    description:
      "Create exam master records for an academic year with validated dates.",
    href: "bulk-operations/exams",
    icon: ClipboardList,
    status: "Ready",
  },
  {
    title: "Exam Schedules",
    description:
      "Create exam schedules for classes, sections and subjects with marks and timings.",
    href: "bulk-operations/exam-schedules",
    icon: CalendarDays,
    status: "Ready",
  },
  {
    title: "Marks",
    description:
      "Upload student marks against existing exam schedules with enrollment and maximum-mark validation.",
    href: "bulk-operations/marks",
    icon: BookOpenCheck,
    status: "Ready",
  },
  {
    title: "Fee Assignments",
    description:
      "Assign existing fee plans to enrolled students by academic year with duplicate and class applicability checks.",
    href: "bulk-operations/fee-assignments",
    icon: IndianRupee,
    status: "Ready",
  },
  {
    title: "Fee Payments",
    description:
      "Import fee payments and automatically allocate them to outstanding installments.",
    href: "bulk-operations/fees",
    icon: IndianRupee,
    status: "Ready",
  },
  {
    title: "Timetable",
    description:
      "Import class and teacher timetable assignments with teacher and class conflict validation.",
    href: "bulk-operations/timetable",
    icon: CalendarDays,
    status: "Ready",
  },
];

export default function BulkOperationsPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}

      <PageHeader
        eyebrow="Administration"
        title="Bulk Operations"
        description="Import large volumes of school data through a controlled, validated workflow."
      />

      {/* ================================================================ */}
      {/* HERO                                                             */}
      {/* ================================================================ */}

      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-7 text-white shadow-2xl shadow-slate-900/15 md:px-8">
        {/* Decorative glows */}

        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Content */}

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full border border-teal-300/15 bg-teal-300/10 px-3 py-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">
                SchoolDB Import Center
              </p>
            </div>

            <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-white md:text-3xl">
              Move school data in minutes.
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Use templates, validate before writing to the database, review
              errors, and keep existing school records safe.
            </p>
          </div>

          {/* Workflow */}

          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.07] px-5 py-4 shadow-xl shadow-black/10 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Workflow
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              Template → Validate → Review → Import
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* OPERATIONS                                                       */}
      {/* ================================================================ */}

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {operations.map((operation) => {
          const Icon = operation.icon;

          return (
            <Card
              key={operation.title}
              className="premium-card group overflow-hidden rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <CardContent className="flex h-full min-h-[220px] flex-col p-5">
                {/* Icon + Status */}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
                    <Icon className="size-5" />
                  </div>

                  {operation.status && (
                    <Badge
                      variant="success"
                      className="rounded-lg px-2 py-1 text-[10px]"
                    >
                      {operation.status}
                    </Badge>
                  )}
                </div>

                {/* Title */}

                <h3 className="mt-5 text-base font-bold tracking-tight">
                  {operation.title}
                </h3>

                {/* Description */}

                <p className="mt-2 flex-1 text-xs leading-5 text-muted-foreground">
                  {operation.description}
                </p>

                {/* Action */}

                <Link
                  href={operation.href}
                  className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Open import
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* ================================================================ */}
      {/* FOOTNOTE                                                         */}
      {/* ================================================================ */}

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        All import workflows validate data before database insertion.
      </div>
    </div>
  );
}

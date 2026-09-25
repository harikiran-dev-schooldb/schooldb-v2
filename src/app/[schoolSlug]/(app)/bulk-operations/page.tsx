import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Bus,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Home,
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
      "Create student records and optional academic-year enrollments from one validated file.",
    href: "bulk-operations/students",
    icon: GraduationCap,
    status: "Ready",
  },
  {
    title: "Student Houses",
    description:
      "Create or update house masters in bulk with code, color, ordering and active status.",
    href: "bulk-operations/houses",
    icon: Home,
    status: "Ready",
  },
  {
    title: "Student House Allocation",
    description:
      "Assign or move students to houses in bulk by academic year and admission number.",
    href: "bulk-operations/house-allocations",
    icon: Home,
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
    title: "Attendance",
    description:
      "Import historical absentee attendance by admission number and date with enrollment and lock validation.",
    href: "bulk-operations/attendance",
    icon: CalendarDays,
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
    title: "Fee Plans",
    description:
      "Create complete fee plans with class applicability and multiple fee items from one validated file.",
    href: "bulk-operations/fee-plans",
    icon: IndianRupee,
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
  {
    title: "Library",
    description:
      "Import book categories, catalog details and physical copy counts.",
    href: "bulk-operations/library",
    icon: BookOpen,
    status: "Ready",
  },
  {
    title: "Transport",
    description:
      "Import vehicles, routes, stops and optional student assignments together.",
    href: "bulk-operations/transport",
    icon: Bus,
    status: "Ready",
  },
];

export default function BulkOperationsPage() {
  return (
    <div className="space-y-6 p-4 pb-12 sm:p-6">
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

      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/60 px-6 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] md:px-8">
        {/* Decorative glows */}

        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-violet-400/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-indigo-400/10 blur-3xl" />

        {/* Content */}

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full border border-primary/15 bg-primary/[0.07] px-3 py-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                SchoolDB Import Center
              </p>
            </div>

            <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-foreground md:text-3xl">
              Move school data in minutes.
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Use templates, validate before writing to the database, review
              errors, and keep existing school records safe.
            </p>
          </div>

          {/* Workflow */}

          <div className="shrink-0 rounded-2xl border border-white/80 bg-white/75 px-5 py-4 shadow-sm backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Workflow
            </p>

            <p className="mt-1 text-sm font-semibold text-foreground">
              Template → Validate → Review → Import
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* OPERATIONS                                                       */}
      {/* ================================================================ */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {operations.map((operation) => {
          const Icon = operation.icon;

          return (
            <Card
              key={operation.title}
              className="premium-card group overflow-hidden rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <CardContent className="flex h-full min-h-[172px] flex-col p-4">
                {/* Icon + Status */}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
                    <Icon className="size-4" />
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

                <h3 className="mt-3 text-sm font-bold tracking-tight">
                  {operation.title}
                </h3>

                {/* Description */}

                <p className="mt-1.5 flex-1 text-xs leading-[1.15rem] text-muted-foreground">
                  {operation.description}
                </p>

                {/* Action */}

                <Link
                  href={operation.href}
                  className="mt-3 inline-flex w-fit items-center gap-2 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
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

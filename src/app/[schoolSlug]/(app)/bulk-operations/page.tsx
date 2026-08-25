import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  IndianRupee,
  Layers3,
  Users,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    description: "Import class and teacher timetable assignments.",
    href: "../timetable",
    icon: CalendarDays,
    status: "Next",
  },
];

export default function BulkOperationsPage() {
  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Administration"
        title="Bulk Operations"
        description="Import large volumes of school data through a controlled, validated workflow."
      />
      <section className="premium-hero px-6 py-6 text-white md:px-8 md:py-7">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">
              SchoolDB Import Center
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Move school data in minutes.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Use templates, validate before writing to the database, review
              errors, and keep the existing school records safe.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              Workflow
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              Template → Validate → Review → Import
            </p>
          </div>
        </div>
      </section>
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {operations.map((operation) => {
          const Icon = operation.icon;
          const ready = operation.status === "Ready";
          return (
            <Card
              key={operation.title}
              className="premium-card group rounded-2xl border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                    <Icon className="size-5" />
                  </div>
                  <Badge variant={ready ? "success" : "outline"}>
                    {operation.status}
                  </Badge>
                </div>
                <h3 className="mt-5 text-base font-bold tracking-tight">
                  {operation.title}
                </h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">
                  {operation.description}
                </p>
                <div className="mt-5">
                  {ready ? (
                    <Link
                      href={operation.href}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                    >
                      Open import
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      Implementation follows the same import engine
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

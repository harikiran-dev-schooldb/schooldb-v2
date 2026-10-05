"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Bus,
  CalendarDays,
  Clock3,
  ClipboardList,
  Copy,
  GraduationCap,
  Home,
  IndianRupee,
  KeyRound,
  Layers3,
  Network,
  Search,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSchool } from "@/contexts/school-context";
import { isRouteAllowed } from "@/lib/route-access";

const categories = [
  {
    id: "setup",
    label: "School Setup",
    description: "Core academic structure and scheduling masters",
  },
  {
    id: "people",
    label: "People",
    description: "Students, teachers, houses and allocations",
  },
  {
    id: "academics",
    label: "Academics",
    description: "Attendance, exams, marks and timetables",
  },
  {
    id: "finance",
    label: "Fees & Finance",
    description: "Fee plans, assignments and collections",
  },
  {
    id: "operations",
    label: "Operations",
    description: "Library and transport data",
  },
] as const;

type CategoryId = (typeof categories)[number]["id"];
type CategoryFilter = "all" | CategoryId;

type BulkOperation = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: string;
  category: CategoryId;
};

const operations: BulkOperation[] = [
  {
    title: "Copy School Setup",
    description:
      "Copy syllabus, branches, classes and sections from demo, with optional subjects and class-subject mappings.",
    href: "bulk-operations/copy-school-setup",
    icon: Copy,
    status: "Ready",
    category: "setup",
  },
  {
    title: "Students",
    description:
      "Create student records and optional academic-year enrollments from one validated file.",
    href: "bulk-operations/students",
    icon: GraduationCap,
    status: "Ready",
    category: "people",
  },
  {
    title: "Student Login Access",
    description:
      "Create Clerk login access only for the students who need to sign in.",
    href: "bulk-operations/student-logins",
    icon: KeyRound,
    status: "Ready",
    category: "people",
  },
  {
    title: "Student Houses",
    description:
      "Create or update house masters in bulk with code, color, ordering and active status.",
    href: "bulk-operations/houses",
    icon: Home,
    status: "Ready",
    category: "people",
  },
  {
    title: "Student House Allocation",
    description:
      "Assign or move students to houses in bulk by academic year and admission number.",
    href: "bulk-operations/house-allocations",
    icon: Home,
    status: "Ready",
    category: "people",
  },
  {
    title: "Student Promotion",
    description:
      "Promote students from one academic year and class section to another.",
    href: "bulk-operations/student-promotion",
    icon: GraduationCap,
    status: "Ready",
    category: "people",
  },
  {
    title: "Teachers",
    description:
      "Import teacher records with employee ID validation and duplicate checks.",
    href: "bulk-operations/teachers",
    icon: UserRound,
    status: "Ready",
    category: "people",
  },
  {
    title: "Teacher Allocation",
    description:
      "Assign teachers to academic-year subject, class and section combinations.",
    href: "bulk-operations/teacher-allocations",
    icon: UserRound,
    status: "Ready",
    category: "people",
  },
  {
    title: "Class Teachers",
    description:
      "Assign one class teacher to each academic-year class and section.",
    href: "bulk-operations/class-teachers",
    icon: UserRound,
    status: "Ready",
    category: "people",
  },
  {
    title: "Classes & Sections",
    description:
      "Create classes and their sections together from one validated CSV.",
    href: "bulk-operations/classes",
    icon: Users,
    status: "Ready",
    category: "setup",
  },
  {
    title: "Subjects",
    description:
      "Import subjects with type, code, ordering, and active status validation.",
    href: "bulk-operations/subjects",
    icon: Layers3,
    status: "Ready",
    category: "setup",
  },
  {
    title: "Class Subjects",
    description:
      "Map subjects to classes for an academic year with duplicate and reference validation.",
    href: "bulk-operations/class-subjects",
    icon: Network,
    status: "Ready",
    category: "setup",
  },
  {
    title: "Attendance",
    description:
      "Import historical absentee attendance by admission number and date with enrollment and lock validation.",
    href: "bulk-operations/attendance",
    icon: CalendarDays,
    status: "Ready",
    category: "academics",
  },
  {
    title: "Exams",
    description:
      "Create exam master records for an academic year with validated dates.",
    href: "bulk-operations/exams",
    icon: ClipboardList,
    status: "Ready",
    category: "academics",
  },
  {
    title: "Exam Schedules",
    description:
      "Create exam schedules for classes, sections and subjects with marks and timings.",
    href: "bulk-operations/exam-schedules",
    icon: CalendarDays,
    status: "Ready",
    category: "academics",
  },
  {
    title: "Marks",
    description:
      "Upload student marks against existing exam schedules with enrollment and maximum-mark validation.",
    href: "bulk-operations/marks",
    icon: BookOpenCheck,
    status: "Ready",
    category: "academics",
  },
  {
    title: "Fee Plans",
    description:
      "Create complete fee plans with class applicability and multiple fee items from one validated file.",
    href: "bulk-operations/fee-plans",
    icon: IndianRupee,
    status: "Ready",
    category: "finance",
  },
  {
    title: "Fee Assignments",
    description:
      "Assign existing fee plans to enrolled students by academic year with duplicate and class applicability checks.",
    href: "bulk-operations/fee-assignments",
    icon: IndianRupee,
    status: "Ready",
    category: "finance",
  },
  {
    title: "Fee Payments",
    description:
      "Import fee payments and automatically allocate them to outstanding installments.",
    href: "bulk-operations/fees",
    icon: IndianRupee,
    status: "Ready",
    category: "finance",
  },
  {
    title: "School Periods",
    description:
      "Create or update timetable periods with time, order and active status validation.",
    href: "bulk-operations/periods",
    icon: Clock3,
    status: "Ready",
    category: "setup",
  },
  {
    title: "Timetable",
    description:
      "Create or update class timetable slots with teacher and class conflict validation.",
    href: "bulk-operations/timetable",
    icon: CalendarDays,
    status: "Ready",
    category: "academics",
  },
  {
    title: "Library",
    description:
      "Import book categories, catalog details and physical copy counts.",
    href: "bulk-operations/library",
    icon: BookOpen,
    status: "Ready",
    category: "operations",
  },
  {
    title: "Transport",
    description:
      "Import vehicles, routes, stops and optional student assignments together.",
    href: "bulk-operations/transport",
    icon: Bus,
    status: "Ready",
    category: "operations",
  },
];

export default function BulkOperationsPage() {
  const { school } = useSchool();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const visibleOperations = operations.filter((operation) =>
    isRouteAllowed(school, operation.href),
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredOperations = visibleOperations.filter((operation) => {
    const matchesCategory =
      category === "all" || operation.category === category;
    const categoryLabel =
      categories.find((item) => item.id === operation.category)?.label ?? "";
    const matchesSearch =
      !normalizedSearch ||
      [operation.title, operation.description, categoryLabel]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });
  const availableCategories = categories.filter((item) =>
    visibleOperations.some((operation) => operation.category === item.id),
  );
  const groupedOperations = availableCategories
    .map((item) => ({
      ...item,
      operations: filteredOperations.filter(
        (operation) => operation.category === item.id,
      ),
    }))
    .filter((item) => item.operations.length > 0);

  return (
    <div className="space-y-6 p-4 pb-12 sm:p-6">
      <PageHeader
        eyebrow="Administration"
        title="Bulk Operations"
        description="Import large volumes of school data through a controlled, validated workflow."
      />

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-bold">Find a bulk operation</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Search by name or choose a category. Every import follows:
                Template → Validate → Review → Import.
              </p>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search students, fees, timetable..."
                aria-label="Search bulk operations"
                className="h-11 rounded-xl bg-background pl-10 pr-10"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              aria-label="Bulk operation categories"
            >
              <CategoryButton
                active={category === "all"}
                label="All"
                count={visibleOperations.length}
                onClick={() => setCategory("all")}
              />
              {availableCategories.map((item) => (
                <CategoryButton
                  key={item.id}
                  active={category === item.id}
                  label={item.label}
                  count={
                    visibleOperations.filter(
                      (operation) => operation.category === item.id,
                    ).length
                  }
                  onClick={() => setCategory(item.id)}
                />
              ))}
            </div>

            <p
              className="shrink-0 text-xs text-muted-foreground"
              aria-live="polite"
            >
              {filteredOperations.length} of {visibleOperations.length}{" "}
              operations
            </p>
          </div>
        </CardContent>
      </Card>

      {groupedOperations.length ? (
        <div className="space-y-6">
          {groupedOperations.map((group) => (
            <section key={group.id} aria-labelledby={`category-${group.id}`}>
              <div className="mb-2.5 flex items-end justify-between gap-4">
                <div>
                  <h2
                    id={`category-${group.id}`}
                    className="text-base font-bold tracking-tight"
                  >
                    {group.label}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {group.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {group.operations.length}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {group.operations.map((operation) => {
                  const Icon = operation.icon;
                  return (
                    <Link
                      key={operation.title}
                      href={operation.href}
                      className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[13px] font-bold leading-5 tracking-tight">
                          {operation.title}
                        </h3>
                        <p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
                          {operation.description}
                        </p>
                      </div>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="rounded-2xl border-dashed border-border/70">
          <CardContent className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Search className="size-5" />
            </div>
            <h2 className="mt-4 text-sm font-bold">No operations found</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Try another search or clear the selected category.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-lg"
              onClick={() => {
                setSearch("");
                setCategory("all");
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        All import workflows validate data before database insertion.
      </div>
    </div>
  );
}

function CategoryButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border/70 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`rounded-md px-1.5 py-0.5 text-[10px] ${
          active ? "bg-white/15" : "bg-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  Copy,
  GraduationCap,
  Layers3,
  Loader2,
  Network,
  School,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { AcademicYearSelect } from "@/components/common/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";
import { cn } from "@/lib/utils";

type Counts = {
  syllabi: number;
  branches: number;
  classes: number;
  sections: number;
  subjects: number;
  classSubjects: number;
};

type CopyResult = {
  sourceSchool: {
    slug: string;
    name: string;
    academicYear: string | null;
  };
  targetSchool: {
    slug: string;
    name: string;
    academicYear: string;
  };
  copySubjects: boolean;
  created: Counts;
  reused: Counts;
};

const setupItems = [
  "Syllabi",
  "Academic Branches",
  "Classes",
  "Sections",
];

export default function CopySchoolSetupPage() {
  const { school } = useSchool();
  const [academicYearId, setAcademicYearId] = useState("");
  const [copySubjects, setCopySubjects] = useState(true);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopyResult | null>(null);

  async function copySetup() {
    if (!academicYearId || copying) return;

    setCopying(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/v1/system/copy-school-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academicYearId,
          copySubjects,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to copy school setup.");
      }

      setResult(payload.data as CopyResult);
    } catch (copyError) {
      setError(
        copyError instanceof Error
          ? copyError.message
          : "Unable to copy school setup.",
      );
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="space-y-6 p-4 pb-12 sm:p-6">
      <PageHeader
        eyebrow="Bulk Operations"
        title="Copy School Setup"
        description="Copy the reusable academic structure from the demo school into this school without copying students, teachers, fees, attendance, or other operational data."
        action={
          <Button variant="outline" asChild>
            <Link href={`/${school.slug}/bulk-operations`}>
              <ArrowLeft className="size-4" />
              Bulk Operations
            </Link>
          </Button>
        }
      />

      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/60 p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700">
                <School className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Template Source
                </p>
                <p className="mt-1 text-base font-bold">demo</p>
              </div>
            </div>
          </div>

          <div className="hidden size-11 items-center justify-center rounded-full border border-primary/15 bg-white text-primary shadow-sm lg:flex">
            <Copy className="size-5" />
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <School className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Target School
                </p>
                <p className="mt-1 text-base font-bold">{school.name}</p>
                <p className="text-xs text-muted-foreground">{school.slug}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <CardTitle>1. Select academic year</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Select the target academic year before copying. If subjects are copied,
                SchoolDB will use the demo academic year with the same name for class-subject mappings.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-md">
            <AcademicYearSelect
              value={academicYearId}
              onChange={(value) => {
                setAcademicYearId(value);
                setResult(null);
                setError(null);
              }}
              autoSelectActive={false}
              disabled={copying}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers3 className="size-5" />
            </div>
            <div>
              <CardTitle>2. Copy subjects?</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Syllabus, branches, classes and sections are always copied. You decide whether subjects and class-subject mappings should also be copied.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <button
            type="button"
            disabled={copying}
            onClick={() => {
              setCopySubjects(true);
              setResult(null);
              setError(null);
            }}
            className={cn(
              "rounded-2xl border p-5 text-left transition-all",
              copySubjects
                ? "border-primary/40 bg-primary/[0.05] ring-2 ring-primary/10"
                : "border-border/70 bg-card hover:border-primary/20",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  copySubjects
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="font-bold">Yes, copy subjects</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Copy Subjects and Class Subjects into the selected academic year.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={copying}
            onClick={() => {
              setCopySubjects(false);
              setResult(null);
              setError(null);
            }}
            className={cn(
              "rounded-2xl border p-5 text-left transition-all",
              !copySubjects
                ? "border-primary/40 bg-primary/[0.05] ring-2 ring-primary/10"
                : "border-border/70 bg-card hover:border-primary/20",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  !copySubjects
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <XCircle className="size-5" />
              </div>
              <div>
                <p className="font-bold">No, stop after sections</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Copy only Syllabus → Branch → Class → Section. Subjects remain unchanged.
                </p>
              </div>
            </div>
          </button>
        </CardContent>
      </Card>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Network className="size-5" />
            </div>
            <div>
              <CardTitle>3. Review and copy</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Existing matching records are reused, so running this again will not intentionally create duplicates.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-6">
          <div className="flex flex-wrap gap-2">
            {setupItems.map((item) => (
              <Badge key={item} variant="secondary" className="rounded-lg px-3 py-1.5">
                {item}
              </Badge>
            ))}
            {copySubjects && (
              <>
                <Badge variant="secondary" className="rounded-lg px-3 py-1.5">
                  Subjects
                </Badge>
                <Badge variant="secondary" className="rounded-lg px-3 py-1.5">
                  Class Subjects
                </Badge>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
            <p className="font-semibold">Not copied</p>
            <p className="mt-1 text-muted-foreground">
              Teachers, teacher allocations, students, enrollments, fees, attendance,
              exams, timetable, users and login accounts are not part of this operation.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Copy could not be completed
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold">School setup copied successfully</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    demo → {result.targetSchool.slug} · Academic year{" "}
                    {result.targetSchool.academicYear}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["Syllabi", "syllabi"],
                    ["Branches", "branches"],
                    ["Classes", "classes"],
                    ["Sections", "sections"],
                    ["Subjects", "subjects"],
                    ["Class Subjects", "classSubjects"],
                  ] as const
                )
                  .filter(([, key]) => result.copySubjects || !["subjects", "classSubjects"].includes(key))
                  .map(([label, key]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-emerald-500/15 bg-white/70 p-4"
                    >
                      <p className="text-xs font-semibold text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-xl font-bold">
                        {result.created[key]} created
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {result.reused[key]} existing reused
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpenCheck className="size-4" />
              Select an academic year before starting.
            </div>

            <Button
              onClick={() => void copySetup()}
              disabled={!academicYearId || copying}
              className="min-w-44"
            >
              {copying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Copy className="size-4" />
              )}
              {copying ? "Copying setup..." : "Start Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

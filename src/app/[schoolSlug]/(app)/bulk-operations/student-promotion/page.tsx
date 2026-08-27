"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Users,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";

type Option = {
  id: string;
  label: string;
};

type Student = {
  id: string;
  admissionNo: string;
  fullName: string | null;
  rollNo: number | null;
};

type PromotionResult = {
  created: number;
  skipped: number;

  students: Array<{
    studentId: string;
    admissionNo: string;
    fullName: string | null;
    rollNo: number | null;
    className: string;
    sectionName: string;
    academicYearName: string;
  }>;

  skippedStudents: Array<{
    studentId: string;
    admissionNo: string;
    fullName: string | null;
    reason: string;
  }>;
};

export default function StudentPromotionPage() {
  const { school } = useSchool();

  const [academicYears, setAcademicYears] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [sourceSections, setSourceSections] = useState<Option[]>([]);
  const [targetSections, setTargetSections] = useState<Option[]>([]);

  const [fromAcademicYearId, setFromAcademicYearId] = useState("");

  const [toAcademicYearId, setToAcademicYearId] = useState("");

  const [fromClassId, setFromClassId] = useState("");

  const [fromSectionId, setFromSectionId] = useState("");

  const [toClassId, setToClassId] = useState("");

  const [toSectionId, setToSectionId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);

  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set(),
  );

  const [loadingYears, setLoadingYears] = useState(true);

  const [loadingStudents, setLoadingStudents] = useState(false);

  const [promoting, setPromoting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<PromotionResult | null>(null);

  /* ------------------------------------------------------------------ */
  /* Load academic years                                                */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    async function loadAcademicYears() {
      try {
        setLoadingYears(true);
        setError(null);

        const response = await fetch("/api/v1/academic-years/options");

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load academic years.");
        }

        setAcademicYears(Array.isArray(payload.data) ? payload.data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load academic years.",
        );
      } finally {
        setLoadingYears(false);
      }
    }

    void loadAcademicYears();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Load classes                                                       */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    async function loadClasses() {
      try {
        const response = await fetch("/api/v1/classes/options");

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load classes.");
        }

        setClasses(Array.isArray(payload.data) ? payload.data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load classes.",
        );
      }
    }

    void loadClasses();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Source sections                                                    */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    setFromSectionId("");
    setSourceSections([]);
    setStudents([]);
    setSelectedStudents(new Set());

    if (!fromClassId) {
      return;
    }

    async function loadSections() {
      try {
        const response = await fetch(
          `/api/v1/sections/options?classId=${encodeURIComponent(fromClassId)}`,
        );

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load source sections.");
        }

        setSourceSections(Array.isArray(payload.data) ? payload.data : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load source sections.",
        );
      }
    }

    void loadSections();
  }, [fromClassId]);

  /* ------------------------------------------------------------------ */
  /* Target sections                                                    */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    setToSectionId("");
    setTargetSections([]);

    if (!toClassId) {
      return;
    }

    async function loadSections() {
      try {
        const response = await fetch(
          `/api/v1/sections/options?classId=${encodeURIComponent(toClassId)}`,
        );

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load target sections.");
        }

        setTargetSections(Array.isArray(payload.data) ? payload.data : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load target sections.",
        );
      }
    }

    void loadSections();
  }, [toClassId]);

  /* ------------------------------------------------------------------ */
  /* Load students                                                      */
  /* ------------------------------------------------------------------ */

  async function loadStudents() {
    if (!fromAcademicYearId || !fromClassId || !fromSectionId) {
      setStudents([]);
      setSelectedStudents(new Set());
      return;
    }

    try {
      setLoadingStudents(true);
      setError(null);
      setResult(null);

      const params = new URLSearchParams({
        academicYearId: fromAcademicYearId,

        classId: fromClassId,

        sectionId: fromSectionId,
      });

      const response = await fetch(
        `/api/v1/student-enrollments/options?${params.toString()}`,
      );

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to load students.");
      }

      const data = Array.isArray(payload.data) ? payload.data : [];

      const filtered: Student[] = data
        .filter(
          (item: {
            student?: {
              id?: string;
              admissionNo?: string;
              fullName?: string | null;
            };
            rollNo?: number | null;
          }) => Boolean(item.student?.id),
        )
        .map(
          (item: {
            student: {
              id: string;
              admissionNo: string;
              fullName: string | null;
            };
            rollNo?: number | null;
          }) => ({
            id: item.student.id,
            admissionNo: item.student.admissionNo,
            fullName: item.student.fullName,
            rollNo: item.rollNo ?? null,
          }),
        );

      setStudents(filtered);
      setSelectedStudents(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load students.");
    } finally {
      setLoadingStudents(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Selection                                                          */
  /* ------------------------------------------------------------------ */

  const allSelected =
    students.length > 0 && selectedStudents.size === students.length;

  function toggleStudent(id: string) {
    setSelectedStudents((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedStudents(new Set());
      return;
    }

    setSelectedStudents(new Set(students.map((student) => student.id)));
  }

  /* ------------------------------------------------------------------ */
  /* Promotion preview                                                  */
  /* ------------------------------------------------------------------ */

  const selectedRows = useMemo(
    () => students.filter((student) => selectedStudents.has(student.id)),
    [students, selectedStudents],
  );

  const canPromote = Boolean(
    fromAcademicYearId &&
    toAcademicYearId &&
    fromClassId &&
    fromSectionId &&
    toClassId &&
    toSectionId &&
    selectedStudents.size > 0 &&
    !promoting,
  );

  /* ------------------------------------------------------------------ */
  /* Promote                                                            */
  /* ------------------------------------------------------------------ */

  async function promoteStudents() {
    if (!canPromote) {
      return;
    }

    if (fromAcademicYearId === toAcademicYearId) {
      setError("Source and target academic year must be different.");
      return;
    }

    try {
      setPromoting(true);
      setError(null);
      setResult(null);

      const response = await fetch("/api/v1/student-enrollments/promote", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          /*
           * The API expects studentIds,
           * not a students array.
           */
          studentIds: selectedRows.map((student) => student.id),

          sourceAcademicYearId: fromAcademicYearId,

          sourceClassId: fromClassId,

          sourceSectionId: fromSectionId,

          targetAcademicYearId: toAcademicYearId,

          targetClassId: toClassId,

          targetSectionId: toSectionId,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Student promotion failed.");
      }

      const promotionResult = payload.data as PromotionResult;

      setResult(promotionResult);

      /*
       * Only remove students that were
       * actually promoted.
       *
       * Skipped students remain visible.
       */
      const promotedIds = new Set(
        promotionResult.students.map((student) => student.studentId),
      );

      setStudents((current) =>
        current.filter((student) => !promotedIds.has(student.id)),
      );

      setSelectedStudents(new Set());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Student promotion failed.",
      );
    } finally {
      setPromoting(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Reset                                                              */
  /* ------------------------------------------------------------------ */

  function resetPromotion() {
    setFromAcademicYearId("");
    setToAcademicYearId("");
    setFromClassId("");
    setFromSectionId("");
    setToClassId("");
    setToSectionId("");

    setSourceSections([]);
    setTargetSections([]);

    setStudents([]);
    setSelectedStudents(new Set());

    setError(null);
    setResult(null);
  }

  const targetAcademicYearName =
    academicYears.find((item) => item.id === toAcademicYearId)?.label ?? "—";

  const targetClassName =
    classes.find((item) => item.id === toClassId)?.label ?? "—";

  const targetSectionName =
    targetSections.find((item) => item.id === toSectionId)?.label ?? "—";

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Bulk Operations"
        title="Student Promotion"
        description="Promote selected students from one academic year and class section into the next academic year."
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/${school.slug}/bulk-operations`}
          className="font-semibold text-primary hover:underline"
        >
          Bulk Operations
        </Link>

        <span>/</span>

        <span>Student Promotion</span>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* ERROR                                                          */}
      {/* -------------------------------------------------------------- */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

          <div>
            <p className="text-sm font-semibold text-destructive">
              Promotion cannot continue
            </p>

            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* RESULT                                                         */}
      {/* -------------------------------------------------------------- */}

      {result && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />

            <div>
              <p className="text-sm font-semibold">Promotion completed</p>

              <p className="mt-1 text-sm text-muted-foreground">
                {result.created} students promoted successfully.
                {result.skipped > 0 && ` ${result.skipped} skipped.`}
              </p>
            </div>
          </div>

          {/* Skipped students */}
          {result.skippedStudents.length > 0 && (
            <Card className="overflow-hidden rounded-2xl border-amber-500/20">
              <CardHeader className="border-b border-border/60 px-6 py-4">
                <CardTitle className="text-sm">Skipped Students</CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/60 bg-muted/30">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Admission No
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Student
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Reason
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {result.skippedStudents.map((student) => (
                        <tr
                          key={student.studentId}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="px-4 py-3 font-medium">
                            {student.admissionNo}
                          </td>

                          <td className="px-4 py-3">
                            {student.fullName ?? "Unnamed Student"}
                          </td>

                          <td className="px-4 py-3 text-muted-foreground">
                            {student.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* SOURCE                                                         */}
      {/* -------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>

            <div>
              <CardTitle>Source</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Select the students to promote.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-6 md:grid-cols-3">
          <SelectField
            label="Academic Year"
            value={fromAcademicYearId}
            onChange={setFromAcademicYearId}
            options={academicYears}
            disabled={loadingYears}
          />

          <SelectField
            label="Class"
            value={fromClassId}
            onChange={setFromClassId}
            options={classes}
          />

          <SelectField
            label="Section"
            value={fromSectionId}
            onChange={setFromSectionId}
            options={sourceSections}
            disabled={!fromClassId}
          />

          <div className="flex justify-end md:col-span-3">
            <Button
              variant="outline"
              disabled={
                !fromAcademicYearId ||
                !fromClassId ||
                !fromSectionId ||
                loadingStudents
              }
              onClick={() => void loadStudents()}
            >
              {loadingStudents && <Loader2 className="size-4 animate-spin" />}

              {loadingStudents ? "Loading Students..." : "Load Students"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------- */}
      {/* TARGET                                                         */}
      {/* -------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <GraduationCap className="size-5" />
            </div>

            <div>
              <CardTitle>Target</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Select where the students will be enrolled.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-6 md:grid-cols-3">
          <SelectField
            label="Academic Year"
            value={toAcademicYearId}
            onChange={setToAcademicYearId}
            options={academicYears}
            disabled={loadingYears}
          />

          <SelectField
            label="Class"
            value={toClassId}
            onChange={setToClassId}
            options={classes}
          />

          <SelectField
            label="Section"
            value={toSectionId}
            onChange={setToSectionId}
            options={targetSections}
            disabled={!toClassId}
          />
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------- */}
      {/* FLOW                                                           */}
      {/* -------------------------------------------------------------- */}

      <div className="hidden items-center justify-center gap-4 md:flex">
        <div className="rounded-xl border border-border/60 bg-card px-5 py-3 text-sm font-semibold">
          Source
        </div>

        <ArrowRight className="size-5 text-muted-foreground" />

        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary">
          Promote
        </div>

        <ArrowRight className="size-5 text-muted-foreground" />

        <div className="rounded-xl border border-border/60 bg-card px-5 py-3 text-sm font-semibold">
          Target
        </div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* STUDENTS                                                       */}
      {/* -------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Students</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Select the students you want to promote.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">{students.length} students</Badge>

              <Badge variant={selectedStudents.size ? "success" : "secondary"}>
                {selectedStudents.size} selected
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Users className="size-5" />
              </div>

              <p className="mt-3 text-sm font-semibold">No students loaded</p>

              <p className="mt-1 text-xs text-muted-foreground">
                Select the source academic year, class and section, then click
                Load Students.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/30">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="size-4 rounded border-border"
                      />
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      #
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Admission No
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Student
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Current Roll No
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student, index) => {
                    const selected = selectedStudents.has(student.id);

                    return (
                      <tr
                        key={student.id}
                        className={`border-b border-border/40 last:border-0 ${
                          selected ? "bg-primary/[0.04]" : "hover:bg-muted/20"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleStudent(student.id)}
                            className="size-4 rounded border-border"
                          />
                        </td>

                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3 font-medium">
                          {student.admissionNo}
                        </td>

                        <td className="px-4 py-3">
                          {student.fullName ?? "Unnamed Student"}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {student.rollNo ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------- */}
      {/* CONFIRMATION                                                   */}
      {/* -------------------------------------------------------------- */}

      {selectedRows.length > 0 && (
        <Card className="premium-card overflow-hidden rounded-2xl border-0">
          <CardHeader className="border-b border-border/60 px-6 py-5">
            <CardTitle>Promotion Summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryItem
                label="Students"
                value={String(selectedRows.length)}
              />

              <SummaryItem
                label="Target Academic Year"
                value={targetAcademicYearName}
              />

              <SummaryItem label="Target Class" value={targetClassName} />

              <SummaryItem label="Target Section" value={targetSectionName} />
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary">Roll numbers</p>

              <p className="mt-1 text-xs text-muted-foreground">
                New roll numbers will be assigned automatically using the next
                available roll number in the target class and section.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-5">
              <Button
                variant="outline"
                onClick={resetPromotion}
                disabled={promoting}
              >
                Reset
              </Button>

              <Button
                disabled={!canPromote}
                onClick={() => void promoteStudents()}
              >
                {promoting && <Loader2 className="size-4 animate-spin" />}

                {promoting
                  ? "Promoting..."
                  : `Promote ${selectedRows.length} Students`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SELECT FIELD                                                              */
/* -------------------------------------------------------------------------- */

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold text-foreground">{label}</span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Select {label}</option>

        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* SUMMARY ITEM                                                              */
/* -------------------------------------------------------------------------- */

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

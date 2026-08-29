"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";

import type { ClassSubjectRow } from "@/features/class-subjects/types";

export default function ClassSubjectsPage() {
  const { school } = useSchool();

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [rows, setRows] = useState<ClassSubjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!academicYearId) {
      setRows([]);
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams({
        academicYearId,
      });

      if (classId) {
        params.set("classId", classId);
      }

      const response = await fetch(
        `/api/v1/class-subjects?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to load class subjects.");
      }

      setRows(result.data ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load class subjects.",
      );

      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [academicYearId, classId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function addSubject() {
    if (!academicYearId || !classId || !subjectId) {
      toast.error("Select academic year, class and subject first.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/v1/class-subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academicYearId,
          classId,
          subjectId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to assign subject.");
      }

      toast.success(result.message ?? "Subject assigned successfully.");

      setSubjectId("");

      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to assign subject.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeSubject(id: string) {
    try {
      const response = await fetch(`/api/v1/class-subjects/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to remove subject.");
      }

      toast.success("Subject removed from class.");

      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove subject.",
      );
    }
  }

  const groupedClasses = useMemo(() => {
    const map = new Map<
      string,
      {
        classId: string;
        className: string;
        subjects: ClassSubjectRow[];
      }
    >();

    for (const row of rows) {
      const existing = map.get(row.classId);

      if (existing) {
        existing.subjects.push(row);
      } else {
        map.set(row.classId, {
          classId: row.classId,
          className: row.className,
          subjects: [row],
        });
      }
    }

    return Array.from(map.values());
  }, [rows]);

  const totalSubjects = rows.length;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="School Setup"
        title="Class Subjects"
        description="Define which subjects are taught in each class for an academic year."
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/${school.slug}/setup`}
          className="font-semibold text-primary hover:underline"
        >
          School Setup
        </Link>

        <span>/</span>

        <span>Class Subjects</span>
      </div>

      {/* Assignment controls */}
      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpenCheck className="size-5" />
            </div>

            <div>
              <CardTitle>Assign Subjects</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Select a class and assign the subjects taught to it.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-5 md:grid-cols-3">
            {/* Academic Year */}
            <Field label="Academic Year">
              <RemoteCombobox
                url="/api/v1/academic-years/options"
                value={academicYearId}
                placeholder="Select academic year"
                onChange={(value) => {
                  setAcademicYearId(value);
                  setClassId("");
                  setSubjectId("");
                }}
              />
            </Field>

            {/* Class */}
            <Field label="Class">
              <RemoteCombobox
                url="/api/v1/classes/options"
                value={classId}
                placeholder="Select class"
                disabled={!academicYearId}
                onChange={(value) => {
                  setClassId(value);
                  setSubjectId("");
                }}
              />
            </Field>

            {/* Subject */}
            <Field label="Subject">
              <RemoteCombobox
                url="/api/v1/subjects/options"
                value={subjectId}
                placeholder="Select subject"
                disabled={!classId}
                onChange={setSubjectId}
              />
            </Field>
          </div>

          <div className="mt-5 flex justify-end border-t border-border/60 pt-5">
            <Button
              type="button"
              onClick={() => void addSubject()}
              disabled={saving || !academicYearId || !classId || !subjectId}
              className="rounded-xl"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}

              {saving ? "Assigning..." : "Assign Subject"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Class → Subjects */}
      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Class Subject Structure</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                {academicYearId
                  ? "Subjects currently assigned to each class."
                  : "Select an academic year to view the subject structure."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={totalSubjects > 0 ? "success" : "secondary"}>
                {totalSubjects} {totalSubjects === 1 ? "subject" : "subjects"}
              </Badge>

              <Badge variant="secondary">
                {groupedClasses.length}{" "}
                {groupedClasses.length === 1 ? "class" : "classes"}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : groupedClasses.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpenCheck className="size-5" />
              </div>

              <p className="mt-4 text-sm font-semibold">
                No class subjects configured
              </p>

              <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                Select an academic year and class above, then assign the
                subjects taught to that class.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {groupedClasses.map((group) => (
                <div
                  key={group.classId}
                  className="overflow-hidden rounded-2xl border border-border/60 bg-card"
                >
                  {/* Class header */}
                  <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-4">
                    <div>
                      <p className="text-base font-bold tracking-tight">
                        {group.className}
                      </p>

                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Subjects offered
                      </p>
                    </div>

                    <Badge variant="secondary">{group.subjects.length}</Badge>
                  </div>

                  {/* Subjects */}
                  <div className="divide-y divide-border/40">
                    {group.subjects.map((row) => (
                      <div
                        key={row.id}
                        className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/20"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BookOpenCheck className="size-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {row.subjectName}
                            </p>

                            <div className="mt-0.5 flex items-center gap-2">
                              {row.subjectCode && (
                                <span className="text-[10px] text-muted-foreground">
                                  {row.subjectCode}
                                </span>
                              )}

                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[9px]"
                              >
                                {row.subjectType}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => void removeSubject(row.id)}
                          className="size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          title="Remove subject"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.03] p-5">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />

        <div>
          <p className="text-sm font-semibold">Class subject mapping</p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            These mappings define the subjects available for each class in the
            selected academic year. Teacher allocations, examinations,
            attendance and timetables can use this structure for validation.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold">{label}</span>

      {children}
    </label>
  );
}

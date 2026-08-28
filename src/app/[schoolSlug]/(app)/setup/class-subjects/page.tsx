"use client";

import { useCallback, useEffect, useState } from "react";
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
      const params = new URLSearchParams({ academicYearId });
      if (classId) params.set("classId", classId);

      const response = await fetch(`/api/v1/class-subjects?${params}`, {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to load class subjects.");
      }

      setRows(result.data ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load class subjects.",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [academicYearId, classId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYearId, classId, subjectId }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to assign subject.");
      }

      toast.success(result.message ?? "Subject assigned successfully.");
      setSubjectId("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign subject.");
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
      toast.error(error instanceof Error ? error.message : "Unable to remove subject.");
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="School Setup"
        title="Class Subjects"
        description="Define which subjects are offered for each class in an academic year."
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href={`/${school.slug}/setup`} className="font-semibold text-primary hover:underline">
          School Setup
        </Link>
        <span>/</span>
        <span>Class Subjects</span>
      </div>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpenCheck className="size-5" />
            </div>
            <div>
              <CardTitle>Assign Subjects</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Select an academic year and class, then add the subjects taught to that class.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-5 md:grid-cols-3">
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
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {saving ? "Assigning..." : "Assign Subject"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Configured Class Subjects</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {academicYearId
                  ? "Subjects currently assigned for the selected academic year."
                  : "Select an academic year to view assignments."}
              </p>
            </div>
            <Badge variant={rows.length > 0 ? "success" : "secondary"}>
              {rows.length} {rows.length === 1 ? "assignment" : "assignments"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <BookOpenCheck className="size-5" />
              </div>
              <p className="mt-3 text-sm font-semibold">No subject assignments</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Select a class and add the subjects offered to it.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/30">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Class</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                      <td className="px-5 py-4 font-semibold">{row.className}</td>
                      <td className="px-5 py-4 font-semibold">{row.subjectName}</td>
                      <td className="px-5 py-4 text-muted-foreground">{row.subjectCode ?? "—"}</td>
                      <td className="px-5 py-4"><Badge variant="secondary">{row.subjectType}</Badge></td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void removeSubject(row.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.03] p-5">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold">Why this mapping matters</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Teacher allocations, attendance, examinations and timetables can now be validated against the subjects actually offered to each class.
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

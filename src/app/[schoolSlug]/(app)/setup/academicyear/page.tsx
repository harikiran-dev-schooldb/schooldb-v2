"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CalendarDays,
  Edit3,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSchool } from "@/contexts/school-context";

type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
};

type AcademicYearForm = {
  name: string;
  startDate: string;
  endDate: string;
};

const emptyForm: AcademicYearForm = {
  name: "",
  startDate: "",
  endDate: "",
};

export default function SetupAcademicYearPage() {
  const { school } = useSchool();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<AcademicYearForm>(emptyForm);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /* Load academic years                                                */
  /* ------------------------------------------------------------------ */

  async function loadAcademicYears() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "/api/v1/academic-years?page=1&pageSize=100",
      );

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to load academic years.");
      }

      setAcademicYears(
        payload.data?.data ?? (Array.isArray(payload.data) ? payload.data : []),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load academic years.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAcademicYears();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Sort                                                               */
  /* ------------------------------------------------------------------ */

  const sortedAcademicYears = useMemo(() => {
    return [...academicYears].sort((a, b) => {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [academicYears]);

  /* ------------------------------------------------------------------ */
  /* Form                                                               */
  /* ------------------------------------------------------------------ */

  function updateForm(field: keyof AcademicYearForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(item: AcademicYear) {
    setEditingId(item.id);

    setForm({
      name: item.name,
      startDate: formatDateForInput(item.startDate),
      endDate: formatDateForInput(item.endDate),
    });

    setError(null);
    setSuccess(null);
  }

  /* ------------------------------------------------------------------ */
  /* Create / Update                                                    */
  /* ------------------------------------------------------------------ */

  async function submitAcademicYear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Academic year name is required.");
      return;
    }

    if (!form.startDate) {
      setError("Start date is required.");
      return;
    }

    if (!form.endDate) {
      setError("End date is required.");
      return;
    }

    if (
      new Date(form.endDate).getTime() <= new Date(form.startDate).getTime()
    ) {
      setError("End date must be after the start date.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        name: form.name.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
      };

      const response = await fetch(
        editingId
          ? `/api/v1/academic-years/${editingId}`
          : "/api/v1/academic-years",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            (editingId
              ? "Unable to update academic year."
              : "Unable to create academic year."),
        );
      }

      setSuccess(
        editingId
          ? "Academic year updated successfully."
          : "Academic year created successfully.",
      );

      resetForm();

      await loadAcademicYears();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save academic year.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Continue                                                           */
  /* ------------------------------------------------------------------ */

  const canContinue = academicYears.length > 0;

  function continueToClasses() {
    if (!canContinue) {
      setError("Create at least one academic year before continuing.");
      return;
    }

    window.location.href = `/${school.slug}/setup/classes`;
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="School Setup"
        title="Academic Year"
        description="Set up the academic year used by your school for students, attendance, examinations, fees and other academic operations."
      />

      {/* ---------------------------------------------------------------- */}
      {/* Breadcrumb                                                       */}
      {/* ---------------------------------------------------------------- */}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/${school.slug}/setup`}
          className="font-semibold text-primary hover:underline"
        >
          School Setup
        </Link>

        <span>/</span>

        <span>Academic Year</span>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Progress                                                         */}
      {/* ---------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Step number="1" label="Academic Year" active />

            <ArrowRight className="size-4 text-muted-foreground" />

            <Step number="2" label="Classes" />

            <ArrowRight className="size-4 text-muted-foreground" />

            <Step number="3" label="Sections" />

            <ArrowRight className="size-4 text-muted-foreground" />

            <Step number="4" label="Subjects" />

            <ArrowRight className="size-4 text-muted-foreground" />

            <Step number="5" label="Periods" />
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Messages                                                         */}
      {/* ---------------------------------------------------------------- */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

          <div>
            <p className="text-sm font-semibold text-destructive">
              Unable to continue
            </p>

            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />

          <div>
            <p className="text-sm font-semibold">Setup updated</p>

            <p className="mt-1 text-sm text-muted-foreground">{success}</p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Add Academic Year                                                */}
      {/* ---------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {editingId ? (
                  <Edit3 className="size-5" />
                ) : (
                  <Plus className="size-5" />
                )}
              </div>

              <div>
                <CardTitle>
                  {editingId ? "Edit Academic Year" : "Add Academic Year"}
                </CardTitle>

                <p className="mt-1 text-xs text-muted-foreground">
                  Define the academic period for your school.
                </p>
              </div>
            </div>

            {editingId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                type="button"
              >
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form
            onSubmit={submitAcademicYear}
            className="grid gap-5 md:grid-cols-3"
          >
            <Field
              label="Academic Year"
              required
              value={form.name}
              onChange={(value) => updateForm("name", value)}
              placeholder="e.g. 2026-27"
            />

            <Field
              label="Start Date"
              required
              type="date"
              value={form.startDate}
              onChange={(value) => updateForm("startDate", value)}
            />

            <Field
              label="End Date"
              required
              type="date"
              value={form.endDate}
              onChange={(value) => updateForm("endDate", value)}
            />

            <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-5 md:col-span-3">
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </Button>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : editingId ? (
                  <Save className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}

                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Academic Year"
                    : "Add Academic Year"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Configured Academic Years                                       */}
      {/* ---------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Configured Academic Years</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                {academicYears.length}{" "}
                {academicYears.length === 1
                  ? "academic year"
                  : "academic years"}{" "}
                configured.
              </p>
            </div>

            <Badge variant={academicYears.length > 0 ? "success" : "secondary"}>
              {academicYears.length > 0 ? "Ready" : "Not configured"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedAcademicYears.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <CalendarDays className="size-5" />
              </div>

              <p className="mt-3 text-sm font-semibold">
                No academic year configured
              </p>

              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Add your first academic year above before continuing with the
                rest of the school setup.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/30">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      #
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Academic Year
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Start Date
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      End Date
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>

                    <th className="w-24 px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedAcademicYears.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4 font-semibold">{item.name}</td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {formatDate(item.startDate)}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {formatDate(item.endDate)}
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant={item.active ? "success" : "secondary"}>
                          {item.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(item)}
                        >
                          <Edit3 className="size-4" />
                          Edit
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

      {/* ---------------------------------------------------------------- */}
      {/* Continue                                                         */}
      {/* ---------------------------------------------------------------- */}

      <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            Academic year is the foundation of your school setup.
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Once your academic year is configured, continue to class setup.
          </p>
        </div>

        <Button onClick={continueToClasses} disabled={!canContinue}>
          Continue to Classes
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* STEP                                                                       */
/* -------------------------------------------------------------------------- */

function Step({
  number,
  label,
  active = false,
  complete = false,
}: {
  number: string;
  label: string;
  active?: boolean;
  complete?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
        active
          ? "bg-primary/10 text-primary"
          : complete
            ? "bg-emerald-500/10 text-emerald-700"
            : "bg-muted/40 text-muted-foreground"
      }`}
    >
      <span
        className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${
          active
            ? "bg-primary text-primary-foreground"
            : complete
              ? "bg-emerald-600 text-white"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {complete ? <Check className="size-3" /> : number}
      </span>

      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FIELD                                                                      */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold">
        {label}

        {required && <span className="ml-1 text-destructive">*</span>}
      </span>

      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* DATE HELPERS                                                               */
/* -------------------------------------------------------------------------- */

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateForInput(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

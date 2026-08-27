"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Edit3, Loader2, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSchool } from "@/contexts/school-context";

import { FormField, SubmitButton } from "@/components/common/forms";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useForm, useWatch } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  academicYearSchema,
  AcademicYearFormInput,
} from "@/features/academic-years/schemas/academic-year.schema";

import { refreshTable } from "@/lib/table-event";

type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  attendanceMode: "ONCE_DAILY" | "MORNING_AFTERNOON" | "EVERY_PERIOD";
  active: boolean;
};

const defaultValues: AcademicYearFormInput = {
  name: "",
  startDate: "",
  endDate: "",
  attendanceMode: "ONCE_DAILY",
};

export default function SetupAcademicYearPage() {
  const { school } = useSchool();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /* Form                                                               */
  /* ------------------------------------------------------------------ */

  const form = useForm<AcademicYearFormInput>({
    resolver: zodResolver(academicYearSchema),

    defaultValues,
  });

  const attendanceMode = useWatch({
    control: form.control,
    name: "attendanceMode",
  });

  /* ------------------------------------------------------------------ */
  /* Load Academic Years                                                */
  /* ------------------------------------------------------------------ */

  async function loadAcademicYears() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "/api/v1/academic-years?page=1&pageSize=100",
        {
          cache: "no-store",
        },
      );

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to load academic years.");
      }

      setAcademicYears(
        payload.data?.data ?? (Array.isArray(payload.data) ? payload.data : []),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load academic years.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          "/api/v1/academic-years?page=1&pageSize=100",
          {
            cache: "no-store",
          },
        );

        const payload = await response.json();

        if (cancelled) return;

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load academic years.");
        }

        setAcademicYears(
          payload.data?.data ??
            (Array.isArray(payload.data) ? payload.data : []),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load academic years.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Sort                                                               */
  /* ------------------------------------------------------------------ */

  const sortedAcademicYears = useMemo(() => {
    return [...academicYears].sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );
  }, [academicYears]);

  /* ------------------------------------------------------------------ */
  /* Edit                                                               */
  /* ------------------------------------------------------------------ */

  async function startEdit(item: AcademicYear) {
    try {
      setError(null);

      const response = await fetch(`/api/v1/academic-years/${item.id}`, {
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to load academic year.");
      }

      const year = payload.data;

      setEditingId(item.id);

      form.reset({
        name: year.name ?? "",
        startDate: formatDateForInput(year.startDate),
        endDate: formatDateForInput(year.endDate),
        attendanceMode: year.attendanceMode ?? "ONCE_DAILY",
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to load academic year.",
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /* Reset                                                              */
  /* ------------------------------------------------------------------ */

  function resetForm() {
    setEditingId(null);
    setError(null);

    form.reset(defaultValues);
  }

  /* ------------------------------------------------------------------ */
  /* Submit                                                             */
  /* ------------------------------------------------------------------ */

  async function onSubmit(values: AcademicYearFormInput) {
    try {
      setError(null);

      const isCreate = !editingId;

      const url = isCreate
        ? "/api/v1/academic-years"
        : `/api/v1/academic-years/${editingId}`;

      const method = isCreate ? "POST" : "PUT";

      const response = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(values),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ??
            (isCreate
              ? "Unable to create academic year."
              : "Unable to update academic year."),
        );
      }

      toast.success(
        payload.message ??
          (isCreate
            ? "Academic year created successfully."
            : "Academic year updated successfully."),
      );

      refreshTable("academic-years");

      resetForm();

      await loadAcademicYears();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save academic year.";

      setError(message);
      toast.error(message);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="School Setup"
        title="Academic Year"
        description="Configure the academic years used by your school, including the attendance mode for each academic year."
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
      {/* Error                                                            */}
      {/* ---------------------------------------------------------------- */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

          <div>
            <p className="text-sm font-semibold text-destructive">
              Unable to save academic year
            </p>

            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Premium Form                                                     */}
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
                  Configure the academic year dates and attendance behavior.
                </p>
              </div>
            </div>

            {editingId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetForm}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* -------------------------------------------------------- */}
            {/* Academic Information                                    */}
            {/* -------------------------------------------------------- */}

            <section className="rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6">
              <div className="mb-6">
                <p className="text-sm font-semibold text-foreground">
                  Academic year information
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Define the academic period and attendance configuration used
                  throughout the school.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  label="Academic Year"
                  required
                  error={form.formState.errors.name?.message}
                >
                  <Input
                    placeholder="e.g. 2026-27"
                    className="h-11 bg-background"
                    {...form.register("name")}
                  />
                </FormField>

                <div />

                <FormField
                  label="Start Date"
                  required
                  error={form.formState.errors.startDate?.message}
                >
                  <Input
                    type="date"
                    className="h-11 bg-background"
                    {...form.register("startDate")}
                  />
                </FormField>

                <FormField
                  label="End Date"
                  required
                  error={form.formState.errors.endDate?.message}
                >
                  <Input
                    type="date"
                    className="h-11 bg-background"
                    {...form.register("endDate")}
                  />
                </FormField>
              </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Attendance Configuration                                 */}
            {/* -------------------------------------------------------- */}

            <section className="rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="size-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Attendance Configuration
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Choose how attendance will be recorded during this academic
                    year.
                  </p>
                </div>
              </div>

              <FormField
                label="Attendance Mode"
                required
                error={form.formState.errors.attendanceMode?.message}
              >
                <Select
                  value={attendanceMode}
                  onValueChange={(value) =>
                    form.setValue(
                      "attendanceMode",
                      value as AcademicYearFormInput["attendanceMode"],
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    )
                  }
                >
                  <SelectTrigger className="h-11 w-full bg-background">
                    <SelectValue placeholder="Select attendance mode" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="ONCE_DAILY">Once Daily</SelectItem>

                    <SelectItem value="MORNING_AFTERNOON">
                      Morning + Afternoon
                    </SelectItem>

                    <SelectItem value="EVERY_PERIOD">Every Period</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <div className="mt-5 rounded-xl border border-primary/10 bg-primary/[0.03] p-4">
                <p className="text-xs font-semibold">
                  {formatAttendanceMode(attendanceMode ?? "ONCE_DAILY")}
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {getAttendanceDescription(attendanceMode ?? "ONCE_DAILY")}
                </p>
              </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Submit                                                     */}
            {/* -------------------------------------------------------- */}

            <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-border/60 bg-card/95 px-6 py-4 backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="h-11 rounded-xl"
                  >
                    Cancel
                  </Button>
                )}

                <SubmitButton
                  loading={form.formState.isSubmitting}
                  mode={editingId ? "edit" : "create"}
                  createLabel="Create Academic Year"
                  updateLabel="Save Changes"
                  className="h-11 rounded-xl px-6 font-semibold shadow-lg shadow-primary/15"
                />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Configured Academic Years                                        */}
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
              {academicYears.length > 0 ? "Configured" : "Not configured"}
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

              <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                Create the first academic year using the form above.
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
                      Attendance Mode
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>

                    <th className="w-28 px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                        <Badge variant="secondary">
                          {formatAttendanceMode(item.attendanceMode)}
                        </Badge>
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
                          onClick={() => void startEdit(item)}
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
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ATTENDANCE MODE                                                            */
/* -------------------------------------------------------------------------- */

function formatAttendanceMode(
  mode: "ONCE_DAILY" | "MORNING_AFTERNOON" | "EVERY_PERIOD",
) {
  switch (mode) {
    case "MORNING_AFTERNOON":
      return "Morning + Afternoon";

    case "EVERY_PERIOD":
      return "Every Period";

    case "ONCE_DAILY":
    default:
      return "Once Daily";
  }
}

/* -------------------------------------------------------------------------- */
/* ATTENDANCE DESCRIPTION                                                    */
/* -------------------------------------------------------------------------- */

function getAttendanceDescription(
  mode: "ONCE_DAILY" | "MORNING_AFTERNOON" | "EVERY_PERIOD",
) {
  switch (mode) {
    case "MORNING_AFTERNOON":
      return "Attendance can be recorded separately for the morning and afternoon sessions.";

    case "EVERY_PERIOD":
      return "Attendance can be recorded for each timetable period.";

    case "ONCE_DAILY":
    default:
      return "One attendance record is maintained for each student per school day.";
  }
}

/* -------------------------------------------------------------------------- */
/* DATE                                                                       */
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

/* -------------------------------------------------------------------------- */
/* DATE INPUT                                                                 */
/* -------------------------------------------------------------------------- */

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

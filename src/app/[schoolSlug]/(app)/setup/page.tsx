"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  School,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";

export default function SchoolSetupPage() {
  const router = useRouter();
  const { school } = useSchool();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function createAcademicYear() {
    setError(null);

    if (!name.trim()) {
      setError("Academic year name is required.");
      return;
    }

    if (!startDate) {
      setError("Start date is required.");
      return;
    }

    if (!endDate) {
      setError("End date is required.");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError("End date must be after the start date.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/v1/academic-years", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          startDate,
          endDate,
          active: true,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to create academic year.");
      }

      setSuccess(true);

      setTimeout(() => {
        router.replace(`/${school.slug}/setup/classes`);
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create academic year.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="School Setup"
        title="Set up your school"
        description="Complete the initial configuration before you start managing students, teachers, attendance and fees."
      />

      {/* Progress */}

      <div className="grid gap-3 md:grid-cols-5">
        <SetupStep number="1" title="Academic Year" />

        <SetupStep number="2" title="Classes" />

        <SetupStep number="3" title="Sections" />

        <SetupStep number="4" title="Subjects" />

        <SetupStep number="5" title="Periods" />
      </div>

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
            <p className="text-sm font-semibold">Academic year created</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Moving to class setup...
            </p>
          </div>
        </div>
      )}

      <Card className="premium-card overflow-hidden rounded-3xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="size-5" />
            </div>

            <div>
              <CardTitle>Academic Year</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Create the academic year that this school will operate in.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-5">
            <div className="flex items-start gap-3">
              <School className="mt-0.5 size-5 text-primary" />

              <div>
                <p className="text-sm font-semibold">{school.name}</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  This academic year will belong to this school.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Field
              label="Academic Year"
              value={name}
              onChange={setName}
              placeholder="2026–27"
              disabled={saving || success}
            />

            <DateField
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              disabled={saving || success}
            />

            <DateField
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              disabled={saving || success}
            />
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 text-primary" />

              <div>
                <p className="text-sm font-semibold">
                  This will become the active academic year
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  The academic year will be used by student enrollments,
                  attendance, examinations, fees, teacher allocations and
                  timetables.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-border/60 pt-5">
            <Button
              className="h-11 rounded-xl px-6"
              disabled={
                saving || success || !name.trim() || !startDate || !endDate
              }
              onClick={() => void createAcademicYear()}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}

              {saving
                ? "Creating..."
                : success
                  ? "Created"
                  : "Continue to Classes"}

              {!saving && !success && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold">{label}</span>

      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold">{label}</span>

      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
      />
    </label>
  );
}

function SetupStep({
  number,
  title,
  active = false,
}: {
  number: string;
  title: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        active ? "border-primary/20 bg-primary/5" : "border-border/60 bg-card"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex size-8 items-center justify-center rounded-lg text-xs font-bold ${
            active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {number}
        </div>

        <span
          className={`text-xs font-semibold ${
            active ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {title}
        </span>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Edit3,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSchool } from "@/contexts/school-context";

type SchoolClass = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  displayOrder: number;
  active: boolean;
};

type ClassForm = {
  name: string;
  code: string;
  description: string;
  displayOrder: string;
};

const DEFAULT_CLASSES = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
];

const emptyForm: ClassForm = {
  name: "",
  code: "",
  description: "",
  displayOrder: "0",
};

export default function SetupClassesPage() {
  const { school } = useSchool();

  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingDefaults, setAddingDefaults] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<ClassForm>(emptyForm);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /* Load classes                                                       */
  /* ------------------------------------------------------------------ */

  async function loadClasses() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/v1/classes?page=1&pageSize=100");

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to load classes.");
      }

      setClasses(payload.data?.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load classes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClasses();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Sorted classes                                                     */
  /* ------------------------------------------------------------------ */

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }

      return a.name.localeCompare(b.name);
    });
  }, [classes]);

  /* ------------------------------------------------------------------ */
  /* Form                                                               */
  /* ------------------------------------------------------------------ */

  function updateForm(field: keyof ClassForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(item: SchoolClass) {
    setEditingId(item.id);

    setForm({
      name: item.name,
      code: item.code ?? "",
      description: item.description ?? "",
      displayOrder: String(item.displayOrder),
    });

    setError(null);
    setSuccess(null);
  }

  /* ------------------------------------------------------------------ */
  /* Create / Update                                                    */
  /* ------------------------------------------------------------------ */

  async function submitClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Class name is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        displayOrder: Number(form.displayOrder) || 0,
      };

      const response = await fetch(
        editingId ? `/api/v1/classes/${editingId}` : "/api/v1/classes",
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
            (editingId ? "Unable to update class." : "Unable to create class."),
        );
      }

      setSuccess(
        editingId
          ? "Class updated successfully."
          : "Class created successfully.",
      );

      resetForm();

      await loadClasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save class.");
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Add recommended classes                                            */
  /* ------------------------------------------------------------------ */

  async function addRecommendedClasses() {
    const existingNames = new Set(
      classes.map((item) => item.name.trim().toLowerCase()),
    );

    const missingClasses = DEFAULT_CLASSES.filter(
      (name) => !existingNames.has(name.toLowerCase()),
    );

    if (missingClasses.length === 0) {
      setSuccess("All recommended classes already exist.");
      return;
    }

    try {
      setAddingDefaults(true);
      setError(null);
      setSuccess(null);

      let created = 0;

      for (let index = 0; index < missingClasses.length; index += 1) {
        const name = missingClasses[index];

        const response = await fetch("/api/v1/classes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            displayOrder: index + 1,
          }),
        });

        const payload = await response.json();

        if (response.ok && payload.success) {
          created += 1;
        }
      }

      await loadClasses();

      setSuccess(
        `${created} recommended ${
          created === 1 ? "class" : "classes"
        } added successfully.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add recommended classes.",
      );
    } finally {
      setAddingDefaults(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Continue                                                           */
  /* ------------------------------------------------------------------ */

  const canContinue = classes.length > 0;

  function continueToSections() {
    if (!canContinue) {
      setError("Create at least one class before continuing.");
      return;
    }

    window.location.href = `/${school.slug}/setup/sections`;
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="School Setup"
        title="Classes"
        description="Set up the academic classes available in your school."
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

        <span>Classes</span>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Progress                                                         */}
      {/* ---------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Step number="1" label="Academic Year" complete />

            <ArrowRight className="size-4 text-muted-foreground" />

            <Step number="2" label="Classes" active />

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
      {/* Create Class                                                     */}
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
                <CardTitle>{editingId ? "Edit Class" : "Add Class"}</CardTitle>

                <p className="mt-1 text-xs text-muted-foreground">
                  Add the classes your school offers.
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
          <form onSubmit={submitClass} className="grid gap-5 md:grid-cols-2">
            <Field
              label="Class Name"
              required
              value={form.name}
              onChange={(value) => updateForm("name", value)}
              placeholder="e.g. Class 1"
            />

            <Field
              label="Class Code"
              value={form.code}
              onChange={(value) => updateForm("code", value)}
              placeholder="e.g. C1"
            />

            <Field
              label="Display Order"
              type="number"
              value={form.displayOrder}
              onChange={(value) => updateForm("displayOrder", value)}
              placeholder="1"
            />

            <Field
              label="Description"
              value={form.description}
              onChange={(value) => updateForm("description", value)}
              placeholder="Optional"
            />

            <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-5 md:col-span-2">
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
                    ? "Update Class"
                    : "Add Class"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Recommended                                                      */}
      {/* ---------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">
              Need a standard school structure?
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Add Nursery through Class 12 automatically. Existing classes will
              not be duplicated.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => void addRecommendedClasses()}
            disabled={addingDefaults}
          >
            {addingDefaults ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GraduationCap className="size-4" />
            )}

            {addingDefaults ? "Adding Classes..." : "Add Recommended Classes"}
          </Button>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Classes                                                          */}
      {/* ---------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Configured Classes</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                {classes.length} {classes.length === 1 ? "class" : "classes"}{" "}
                configured.
              </p>
            </div>

            <Badge variant={classes.length > 0 ? "success" : "secondary"}>
              {classes.length > 0 ? "Ready" : "Not configured"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedClasses.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <GraduationCap className="size-5" />
              </div>

              <p className="mt-3 text-sm font-semibold">
                No classes configured
              </p>

              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Add your first class above or use the recommended class
                structure.
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
                      Class
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Code
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Description
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
                  {sortedClasses.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4 font-semibold">{item.name}</td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {item.code ?? "—"}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-muted-foreground">
                        {item.description ?? "—"}
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
            Classes are the foundation for your sections and enrollments.
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Once your classes are configured, continue to section setup.
          </p>
        </div>

        <Button onClick={continueToSections} disabled={!canContinue}>
          Continue to Sections
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

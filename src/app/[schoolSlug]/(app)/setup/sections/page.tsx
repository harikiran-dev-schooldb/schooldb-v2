"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Edit3,
  Layers3,
  Loader2,
  Plus,
  Save,
  Settings2,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSchool } from "@/contexts/school-context";

type Option = {
  id: string;
  label: string;
};

type Section = {
  id: string;
  name: string;
  classId: string;
  className: string;
  displayOrder: number;
  active: boolean;
};

type SectionForm = {
  classId: string;
  name: string;
  displayOrder: string;
};

const emptyForm: SectionForm = {
  classId: "",
  name: "",
  displayOrder: "0",
};

export default function SetupSectionsPage() {
  const { school } = useSchool();

  const [classes, setClasses] = useState<Option[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<SectionForm>(emptyForm);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /* Load Classes                                                       */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    async function loadClasses() {
      try {
        const response = await fetch("/api/v1/classes/options", {
          cache: "no-store",
        });

        const payload = await response.json();

        if (cancelled) return;

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load classes.");
        }

        setClasses(payload.data ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load classes.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingClasses(false);
        }
      }
    }

    void loadClasses();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Load Sections                                                      */
  /* ------------------------------------------------------------------ */

  async function loadSections() {
    try {
      setLoadingSections(true);
      setError(null);

      const response = await fetch("/api/v1/sections?page=1&pageSize=500", {
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to load sections.");
      }

      setSections(
        payload.data?.data ?? (Array.isArray(payload.data) ? payload.data : []),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load sections.");
    } finally {
      setLoadingSections(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/v1/sections?page=1&pageSize=500", {
          cache: "no-store",
        });

        const payload = await response.json();

        if (cancelled) return;

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load sections.");
        }

        setSections(
          payload.data?.data ??
            (Array.isArray(payload.data) ? payload.data : []),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load sections.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSections(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Group Sections By Class                                            */
  /* ------------------------------------------------------------------ */

  const sectionsByClass = useMemo(() => {
    const map = new Map<string, Section[]>();

    for (const section of sections) {
      const current = map.get(section.classId) ?? [];

      current.push(section);

      map.set(section.classId, current);
    }

    for (const items of map.values()) {
      items.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }

        return a.name.localeCompare(b.name);
      });
    }

    return map;
  }, [sections]);

  /* ------------------------------------------------------------------ */
  /* Form                                                               */
  /* ------------------------------------------------------------------ */

  function updateForm(field: keyof SectionForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(section: Section) {
    setEditingId(section.id);

    setForm({
      classId: section.classId,
      name: section.name,
      displayOrder: String(section.displayOrder),
    });

    setError(null);
    setSuccess(null);
  }

  /* ------------------------------------------------------------------ */
  /* Create / Update                                                    */
  /* ------------------------------------------------------------------ */

  async function submitSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.classId) {
      setError("Please select a class.");
      return;
    }

    if (!form.name.trim()) {
      setError("Section name is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        classId: form.classId,
        name: form.name.trim(),
        displayOrder: Number(form.displayOrder) || 0,
      };

      const response = await fetch(
        editingId ? `/api/v1/sections/${editingId}` : "/api/v1/sections",
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
              ? "Unable to update section."
              : "Unable to create section."),
        );
      }

      setSuccess(
        editingId
          ? "Section updated successfully."
          : "Section created successfully.",
      );

      resetForm();

      await loadSections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save section.");
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Continue To Setup Dashboard                                        */
  /* ------------------------------------------------------------------ */

  const canFinish = sections.length > 0;

  function finishSetup() {
    if (!canFinish) {
      setError("Create at least one section before finishing setup.");

      return;
    }

    window.location.href = `/${school.slug}/setup`;
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="School Setup"
        title="Sections"
        description="Configure the sections available under each class."
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

        <span>Sections</span>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Setup Progress                                                   */}
      {/* ---------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardContent className="p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Step number="1" label="Academic Year" complete />

            <Step number="2" label="Classes" complete />

            <Step number="3" label="Sections" active />
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
      {/* Add Section                                                      */}
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
                  {editingId ? "Edit Section" : "Add Section"}
                </CardTitle>

                <p className="mt-1 text-xs text-muted-foreground">
                  Add sections such as A, B or C under a class.
                </p>
              </div>
            </div>

            {editingId && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={resetForm}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={submitSection} className="grid gap-5 md:grid-cols-3">
            <SelectField
              label="Class"
              value={form.classId}
              onChange={(value) => updateForm("classId", value)}
              options={classes}
              disabled={loadingClasses || saving}
            />

            <Field
              label="Section Name"
              value={form.name}
              onChange={(value) => updateForm("name", value)}
              placeholder="e.g. A"
              required
            />

            <Field
              label="Display Order"
              type="number"
              value={form.displayOrder}
              onChange={(value) => updateForm("displayOrder", value)}
              placeholder="1"
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

              <Button type="submit" disabled={saving || loadingClasses}>
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
                    ? "Save Changes"
                    : "Add Section"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Sections Overview                                                */}
      {/* ---------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Configured Sections</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Sections are organized by class.
              </p>
            </div>

            <Badge variant={sections.length > 0 ? "success" : "secondary"}>
              {sections.length} {sections.length === 1 ? "section" : "sections"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingSections ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : sections.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Layers3 className="size-5" />
              </div>

              <p className="mt-3 text-sm font-semibold">
                No sections configured
              </p>

              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Add your first section above. For example, Class 1 → Section A.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {classes.map((classItem) => {
                const classSections = sectionsByClass.get(classItem.id) ?? [];

                return (
                  <div key={classItem.id} className="p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Settings2 className="size-4" />
                        </div>

                        <div>
                          <p className="text-sm font-bold">{classItem.label}</p>

                          <p className="text-xs text-muted-foreground">
                            {classSections.length}{" "}
                            {classSections.length === 1
                              ? "section"
                              : "sections"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {classSections.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-xs text-muted-foreground">
                        No sections configured for this class.
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {classSections.map((section) => (
                          <div
                            key={section.id}
                            className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4"
                          >
                            <div>
                              <p className="text-sm font-bold">
                                Section {section.name}
                              </p>

                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Order {section.displayOrder}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(section)}
                            >
                              <Edit3 className="size-4" />
                              Edit
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Finish Setup                                                     */}
      {/* ---------------------------------------------------------------- */}

      <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-primary/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            Basic school setup is complete.
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Academic year, classes and sections are the core setup items. Other
            data can be managed through their respective modules and bulk
            imports.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              (window.location.href = `/${school.slug}/setup/classes`)
            }
          >
            <ArrowLeft className="size-4" />
            Classes
          </Button>

          <Button onClick={finishSetup} disabled={!canFinish}>
            Finish Setup
            <CheckCircle2 className="size-4" />
          </Button>
        </div>
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
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        active
          ? "border-primary/20 bg-primary/5 text-primary"
          : complete
            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700"
            : "border-border/60 bg-muted/30 text-muted-foreground"
      }`}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          active
            ? "bg-primary text-primary-foreground"
            : complete
              ? "bg-emerald-600 text-white"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {complete ? <Check className="size-3.5" /> : number}
      </span>

      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SELECT FIELD                                                               */
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
      <span className="text-xs font-semibold">
        {label}
        <span className="ml-1 text-destructive">*</span>
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
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
        className="h-11 bg-background"
      />
    </label>
  );
}

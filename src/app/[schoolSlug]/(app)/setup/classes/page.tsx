"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Plus,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSchool } from "@/contexts/school-context";

import { ClassForm } from "@/features/classes/components/ClassForm";

type SchoolClass = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  displayOrder: number;
  active: boolean;
};

export default function SetupClassesPage() {
  const { school } = useSchool();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /* Load Classes                                                       */
  /* ------------------------------------------------------------------ */

  async function loadClasses() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/v1/classes?page=1&pageSize=100", {
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to load classes.");
      }

      setClasses(
        payload.data?.data ?? (Array.isArray(payload.data) ? payload.data : []),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load classes.");
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

        const response = await fetch("/api/v1/classes?page=1&pageSize=100", {
          cache: "no-store",
        });

        const payload = await response.json();

        if (cancelled) return;

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load classes.");
        }

        setClasses(
          payload.data?.data ??
            (Array.isArray(payload.data) ? payload.data : []),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load classes.",
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
  /* Form                                                               */
  /* ------------------------------------------------------------------ */

  function openCreate() {
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function handleFormSuccess() {
    closeForm();
    void loadClasses();
  }

  /* ------------------------------------------------------------------ */
  /* Sorted Classes                                                     */
  /* ------------------------------------------------------------------ */

  const sortedClasses = [...classes].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }

    return a.name.localeCompare(b.name);
  });

  /* ------------------------------------------------------------------ */
  /* Status                                                             */
  /* ------------------------------------------------------------------ */

  const configured = classes.length > 0;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="School Setup"
        title="Classes"
        description="Configure the academic classes available in your school."
        action={
          !showForm ? (
            <Button onClick={openCreate} className="rounded-xl">
              <Plus className="size-4" />
              Add Class
            </Button>
          ) : undefined
        }
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
      {/* Error                                                            */}
      {/* ---------------------------------------------------------------- */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

          <div>
            <p className="text-sm font-semibold text-destructive">
              Unable to load classes
            </p>

            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Form                                                             */}
      {/* ---------------------------------------------------------------- */}

      {showForm && (
        <Card className="premium-card overflow-hidden rounded-2xl border-0">
          <CardHeader className="border-b border-border/60 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {editingId ? (
                    <GraduationCap className="size-5" />
                  ) : (
                    <Plus className="size-5" />
                  )}
                </div>

                <div>
                  <CardTitle>
                    {editingId ? "Edit Class" : "Add Class"}
                  </CardTitle>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Configure the class information used by your school.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeForm}
              >
                Cancel
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <ClassForm
              mode={editingId ? "edit" : "create"}
              classId={editingId ?? undefined}
              onSuccess={handleFormSuccess}
            />
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Configuration Status                                             */}
      {/* ---------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="size-5" />
              </div>

              <div>
                <CardTitle>Class Configuration</CardTitle>

                <p className="mt-1 text-xs text-muted-foreground">
                  Classes define the academic structure of your school.
                </p>
              </div>
            </div>

            <Badge variant={configured ? "success" : "secondary"}>
              {configured ? `${classes.length} Configured` : "Not configured"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 text-primary" />

              <div>
                <p className="text-sm font-semibold">
                  Classes are school-level configuration
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Once classes are configured, sections can be created under
                  each class. Students will later be enrolled into these class
                  and section combinations for an academic year.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Configured Classes                                               */}
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

            {!showForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={openCreate}
                className="rounded-xl"
              >
                <Plus className="size-4" />
                Add Class
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedClasses.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <GraduationCap className="size-5" />
              </div>

              <p className="mt-3 text-sm font-semibold">
                No classes configured
              </p>

              <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                Add the classes offered by your school to continue with section
                configuration.
              </p>

              <Button className="mt-5 rounded-xl" onClick={openCreate}>
                <Plus className="size-4" />
                Add First Class
              </Button>
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

                    <th className="w-28 px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                          onClick={() => openEdit(item.id)}
                        >
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
      {/* Go to Sections                                                   */}
      {/* ---------------------------------------------------------------- */}

      {configured && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Configure sections</p>

            <p className="mt-1 text-xs text-muted-foreground">
              Create sections such as A, B and C under your configured classes.
            </p>
          </div>

          <Button
            onClick={() => routerPush(`/${school.slug}/setup/sections`)}
            className="rounded-xl"
          >
            Sections
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

function routerPush(path: string) {
  window.location.href = path;
}

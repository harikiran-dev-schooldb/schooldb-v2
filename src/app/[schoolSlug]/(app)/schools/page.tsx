"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Building2, Loader2, Plus, School, Smartphone, X } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SchoolItem = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  _count: {
    students: number;
    teachers: number;
    memberships: number;
  };
};

export default function SchoolsPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSchools() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/schools", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to load schools.");
      }
      setSchools(payload.data.schools);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load schools.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSchools();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateName(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .replace(/-+/g, "-"),
      );
    }
  }

  async function createSchool() {
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError("School name and School URL are required.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/v1/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to create school.");
      }

      setName("");
      setSlug("");
      setSlugTouched(false);
      setShowCreate(false);
      await loadSchools();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create school.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          eyebrow="Super Admin"
          title="Schools"
          description="Create and manage SchoolDB school workspaces."
        />
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={"/" + schoolSlug + "/schools/android-app"}>
              <Smartphone className="size-4" />
              Android App Builder
            </Link>
          </Button>
          <Button className="rounded-xl" onClick={() => setShowCreate(true)}>
            <Plus className="size-4" />
            Add School
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {showCreate && (
        <Card className="premium-card rounded-3xl border-0">
          <CardContent className="p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Create New School</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You will automatically receive SUPER_ADMIN membership for the new school.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)} disabled={saving}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="new-school-name" className="text-xs font-semibold">School Name</label>
                <input
                  id="new-school-name"
                  value={name}
                  onChange={(event) => updateName(event.target.value)}
                  disabled={saving}
                  placeholder="e.g. ABC Public School"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="new-school-slug" className="text-xs font-semibold">School URL</label>
                <div className="flex items-center rounded-xl border border-border bg-background focus-within:border-primary">
                  <span className="border-r border-border px-3 text-sm text-muted-foreground">/</span>
                  <input
                    id="new-school-slug"
                    value={slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    }}
                    disabled={saving}
                    placeholder="abc-public-school"
                    className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
              <Button onClick={() => void createSchool()} disabled={saving || !name.trim() || !slug.trim()}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "Creating..." : "Create School"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex min-h-52 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {schools.map((item) => (
            <Card key={item.id} className="premium-card overflow-hidden rounded-2xl border-0">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <School className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold">{item.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">/{item.slug}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  <Metric label="Students" value={item._count.students} />
                  <Metric label="Teachers" value={item._count.teachers} />
                  <Metric label="Users" value={item._count.memberships} />
                </div>

                <Button asChild variant="outline" className="mt-6 w-full rounded-xl">
                  <Link href={`/${item.slug}/dashboard`}>
                    <Building2 className="size-4" />
                    Open School
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3 text-center">
      <p className="text-base font-bold">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

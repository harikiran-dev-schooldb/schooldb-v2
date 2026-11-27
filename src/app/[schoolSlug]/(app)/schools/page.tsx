"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  Search,
  Globe2,
  ImageUp,
  Loader2,
  ListChecks,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SchoolLogo } from "@/components/branding/SchoolLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SchoolItem = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
};

export default function SchoolsPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [search, setSearch] = useState("");
  const filteredSchools = schools.filter(item => (item.name+" "+item.slug).toLowerCase().includes(search.trim().toLowerCase()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoActionId, setLogoActionId] = useState<string | null>(null);
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

  async function uploadLogo(schoolId: string, file: File) {
    setError(null);
    setLogoActionId(schoolId);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(`/api/v1/schools/${schoolId}/logo`, {
        method: "POST",
        body,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to upload the school logo.");
      }
      const logo = payload.data.logo as string;
      setSchools((items) =>
        items.map((item) => (item.id === schoolId ? { ...item, logo } : item)),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload the school logo.");
    } finally {
      setLogoActionId(null);
    }
  }

  async function removeLogo(schoolId: string) {
    setError(null);
    setLogoActionId(schoolId);
    try {
      const response = await fetch(`/api/v1/schools/${schoolId}/logo`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to remove the school logo.");
      }
      setSchools((items) =>
        items.map((item) =>
          item.id === schoolId ? { ...item, logo: null } : item,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove the school logo.");
    } finally {
      setLogoActionId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 pb-12 sm:p-6">
      <div className="premium-hero relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-primary/15 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <PageHeader
          eyebrow="Super Admin"
          title="Schools"
          description="Manage school identities, access and individual workspace configuration."
        />
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={"/" + schoolSlug + "/schools/route-access"}>
              <ListChecks className="size-4" />
              Route Access
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

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold tracking-tight">School directory</h2><p className="text-xs text-muted-foreground">{loading?"Loading workspaces…":filteredSchools.length+" of "+schools.length+" schools"}</p></div><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground"/><input aria-label="Search schools" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search school name or URL" className="h-11 w-full rounded-xl border bg-background pl-9 pr-3 text-sm shadow-sm outline-none focus:border-primary"/></div></div>
      {loading ? (
        <div aria-busy="true" aria-label="Loading schools" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-64 animate-pulse rounded-3xl bg-muted"/>)}</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {!filteredSchools.length&&<div className="col-span-full rounded-3xl border border-dashed p-10 text-center"><Building2 className="mx-auto mb-3 size-8 text-muted-foreground"/><p className="font-semibold">{search?"No matching schools":"No schools available"}</p><p className="mt-1 text-sm text-muted-foreground">{search?"Try another school name or URL.":"Use Add School to create a workspace."}</p></div>}
          {filteredSchools.map((item) => (
            <Card key={item.id} className="premium-card group overflow-hidden rounded-3xl border border-border/70 transition hover:border-primary/30 hover:shadow-lg">
              <CardContent className="p-0">
                <div className="flex items-start gap-4 border-b border-border/50 bg-gradient-to-br from-primary/[0.06] to-transparent p-5">
                  <SchoolLogo
                    src={item.logo}
                    schoolName={item.name}
                    sizes="64px"
                    className="size-16 rounded-2xl shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-base font-bold tracking-tight">{item.name}</h2>
                    <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground"><Globe2 className="size-3.5 shrink-0"/><span className="truncate">/{item.slug}</span></p>
                  </div>
                </div>

                <div className="p-5"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold text-muted-foreground">School branding</p><span className="text-xs text-muted-foreground">{item.logo?"Logo uploaded":"No logo"}</span></div><div className="flex gap-2">
                  <label className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold transition hover:bg-muted/50 has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50">
                    {logoActionId === item.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ImageUp className="size-4" />
                    )}
                    {item.logo ? "Replace logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={logoActionId === item.id}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void uploadLogo(item.id, file);
                      }}
                    />
                  </label>
                  {item.logo && (
                    <ConfirmDialog
                      eyebrow="School branding"
                      title={`Remove ${item.name}'s logo?`}
                      description="The current school logo will be removed from navigation, documents, and other branded screens."
                      consequence="You can upload a replacement later, but the current image will no longer be available."
                      confirmLabel="Remove logo"
                      destructive
                      pending={logoActionId === item.id}
                      onConfirm={() => void removeLogo(item.id)}
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-10 shrink-0 rounded-xl text-destructive hover:text-destructive"
                          disabled={logoActionId === item.id}
                          aria-label={`Remove ${item.name} logo`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  )}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  PNG, JPG, or WebP · square image recommended · maximum 5 MB
                </p>

                </div><div className="grid grid-cols-1 gap-2 border-t bg-muted/15 p-4 sm:grid-cols-2">
                  <Button asChild variant="outline" className="w-full rounded-xl">
                    <Link href={`/${schoolSlug}/schools/route-access?schoolId=${encodeURIComponent(item.id)}`} aria-label={`Settings for ${item.name}`}>
                      <Settings2 className="size-4" />
                      Settings
                    </Link>
                  </Button>
                  <Button asChild className="w-full rounded-xl">
                    <Link href={`/${item.slug}`}>
                      Open School <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

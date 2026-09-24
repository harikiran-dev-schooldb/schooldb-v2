"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Loader2,
  PackageCheck,
  RefreshCw,
  Smartphone,
  UploadCloud,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSchool } from "@/contexts/school-context";

type SchoolItem = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
};

type BuildItem = {
  id: string;
  status: "QUEUED" | "BUILDING" | "COMPLETED" | "FAILED";
  message: string | null;
  githubRunId: string | null;
  githubRunUrl: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  school: SchoolItem;
  configuration: {
    flavorId: string;
    applicationId: string;
    appName: string;
  };
};

type FormState = {
  schoolId: string;
  flavorId: string;
  applicationId: string;
  schoolName: string;
  shortName: string;
  schoolSlug: string;
  location: string;
  supportLabel: string;
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  dangerColor: string;
};

const INITIAL_COLORS = {
  primaryColor: "#235A8C",
  secondaryColor: "#2E7D4F",
  accentColor: "#E0A62B",
  dangerColor: "#C7352E",
};

function flavorFromSlug(slug: string) {
  return (
    slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .replace(/^[^a-z]+/, "") || "school"
  );
}

function formForSchool(item: SchoolItem): FormState {
  const flavorId = flavorFromSlug(item.slug);
  const shortName = item.name.toUpperCase();
  return {
    schoolId: item.id,
    flavorId,
    applicationId: "com.schooldb.support." + flavorId,
    schoolName: item.name,
    shortName,
    schoolSlug: item.slug,
    location: "",
    supportLabel: shortName + " SUPPORT",
    appName: item.name,
    ...INITIAL_COLORS,
  };
}

const EMPTY_FORM: FormState = {
  schoolId: "",
  flavorId: "",
  applicationId: "",
  schoolName: "",
  shortName: "",
  schoolSlug: "",
  location: "",
  supportLabel: "",
  appName: "",
  ...INITIAL_COLORS,
};

export function AndroidAppBuilder() {
  const { school: currentSchool } = useSchool();
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [builds, setBuilds] = useState<BuildItem[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [logo, setLogo] = useState<File | null>(null);
  const [firebaseConfig, setFirebaseConfig] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const headers = useMemo(
    () => ({ "x-school-slug": currentSchool.slug }),
    [currentSchool.slug],
  );

  const loadBuilds = useCallback(async () => {
    const response = await fetch("/api/v1/android-builds", {
      cache: "no-store",
      headers,
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.message ?? "Unable to load Android builds.");
    }
    setBuilds(payload.data.builds);
    setConfigured(payload.data.configured);
  }, [headers]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schoolsResponse] = await Promise.all([
        fetch("/api/v1/schools", { cache: "no-store", headers }),
        loadBuilds(),
      ]);
      const schoolsPayload = await schoolsResponse.json();
      if (!schoolsResponse.ok || !schoolsPayload.success) {
        throw new Error(schoolsPayload.message ?? "Unable to load schools.");
      }
      const items = schoolsPayload.data.schools as SchoolItem[];
      setSchools(items);
      const initial =
        items.find((item) => item.slug === currentSchool.slug) ?? items[0];
      if (initial) setForm(formForSchool(initial));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load the builder.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentSchool.slug, headers, loadBuilds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPage();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPage]);

  const activeBuild = builds.some(
    (item) => item.status === "QUEUED" || item.status === "BUILDING",
  );

  useEffect(() => {
    if (!activeBuild) return;
    const timer = window.setInterval(() => {
      void loadBuilds().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeBuild, loadBuilds]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectSchool(schoolId: string) {
    const selected = schools.find((item) => item.id === schoolId);
    if (!selected) return;
    setForm(formForSchool(selected));
    setLogo(null);
    setFirebaseConfig(null);
    setError(null);
    setNotice(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!logo || !firebaseConfig) {
      setError("Choose a PNG logo and the school's google-services.json file.");
      return;
    }

    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.set(key, value));
    body.set("logo", logo);
    body.set("firebaseConfig", firebaseConfig);

    try {
      setSubmitting(true);
      const response = await fetch("/api/v1/android-builds", {
        method: "POST",
        headers,
        body,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to start the Android build.");
      }
      setNotice("The signed Android app is now building in GitHub Actions.");
      setLogo(null);
      setFirebaseConfig(null);
      await loadBuilds();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to start the Android build.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Super Admin"
        title="Android App Builder"
        description="Create a branded, signed School Support Android app without using the terminal."
      />

      {!configured && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Add the GitHub Actions token to the web app environment before
          starting a build.
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl border-0">
          <CardHeader>
            <CardTitle>School and app identity</CardTitle>
            <CardDescription>
              The selected school is permanently embedded into this Android app.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Field label="School">
              <select
                value={form.schoolId}
                onChange={(event) => selectSchool(event.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary"
              >
                {schools.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <Input
                value={form.location}
                onChange={(event) => update("location", event.target.value)}
                placeholder="City or campus"
              />
            </Field>
            <Field label="App name">
              <Input
                value={form.appName}
                onChange={(event) => update("appName", event.target.value)}
              />
            </Field>
            <Field label="Application ID">
              <Input
                value={form.applicationId}
                onChange={(event) =>
                  update(
                    "applicationId",
                    event.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""),
                  )
                }
              />
            </Field>
            <Field label="School URL">
              <Input value={form.schoolSlug} disabled />
            </Field>
            <Field label="Build flavor">
              <Input value={form.flavorId} disabled />
            </Field>
            <Field label="Short name">
              <Input
                value={form.shortName}
                onChange={(event) => update("shortName", event.target.value)}
              />
            </Field>
            <Field label="Support label">
              <Input
                value={form.supportLabel}
                onChange={(event) => update("supportLabel", event.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0">
          <CardHeader>
            <CardTitle>Branding and Firebase</CardTitle>
            <CardDescription>
              Upload the school logo and matching Firebase Android configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="School logo">
              <Input
                type="file"
                accept="image/png"
                onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                PNG format, up to 2 MB.
              </p>
            </Field>
            <Field label="Firebase configuration">
              <Input
                type="file"
                accept="application/json,.json"
                onChange={(event) =>
                  setFirebaseConfig(event.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs text-muted-foreground">
                The Firebase package must match {form.applicationId || "the application ID"}.
              </p>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <ColorField
                label="Primary"
                value={form.primaryColor}
                onChange={(value) => update("primaryColor", value)}
              />
              <ColorField
                label="Secondary"
                value={form.secondaryColor}
                onChange={(value) => update("secondaryColor", value)}
              />
              <ColorField
                label="Accent"
                value={form.accentColor}
                onChange={(value) => update("accentColor", value)}
              />
              <ColorField
                label="Danger"
                value={form.dangerColor}
                onChange={(value) => update("dangerColor", value)}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                submitting ||
                !configured ||
                !form.schoolId ||
                !logo ||
                !firebaseConfig
              }
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UploadCloud className="size-4" />
              )}
              {submitting ? "Starting build..." : "Build Android App"}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card className="rounded-3xl border-0">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Build history</CardTitle>
            <CardDescription>
              Signed APK and Play Store AAB artifacts remain available according
              to GitHub&apos;s artifact retention policy.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadBuilds()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {builds.length === 0 ? (
            <div className="rounded-2xl bg-muted/40 px-5 py-10 text-center">
              <Smartphone className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">No Android builds yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete the form above to create the first school app.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {builds.map((build) => (
                <BuildRow
                  key={build.id}
                  build={build}
                  schoolSlug={currentSchool.slug}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="size-10 shrink-0 cursor-pointer rounded-lg border border-input bg-card p-1"
          aria-label={label + " color"}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          maxLength={7}
        />
      </div>
    </Field>
  );
}

function BuildRow({
  build,
  schoolSlug,
}: {
  build: BuildItem;
  schoolSlug: string;
}) {
  const running = build.status === "QUEUED" || build.status === "BUILDING";
  const completed = build.status === "COMPLETED";
  const failed = build.status === "FAILED";
  const Icon = completed
    ? CheckCircle2
    : failed
      ? XCircle
      : running
        ? Loader2
        : Clock3;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center">
      <div
        className={
          "flex size-11 shrink-0 items-center justify-center rounded-xl " +
          (completed
            ? "bg-emerald-50 text-emerald-700"
            : failed
              ? "bg-red-50 text-red-700"
              : "bg-blue-50 text-blue-700")
        }
      >
        <Icon className={"size-5 " + (running ? "animate-spin" : "")} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{build.configuration.appName}</p>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tracking-wide">
            {build.status}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {build.configuration.applicationId} · {build.school.name}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {build.message || "Waiting for an update."} ·{" "}
          {new Date(build.createdAt).toLocaleString()}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {build.githubRunUrl && (
          <Button asChild variant="outline" size="sm">
            <a
              href={build.githubRunUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-4" />
              Logs
            </a>
          </Button>
        )}
        {completed && (
          <Button asChild size="sm">
            <a
              href={
                "/api/v1/android-builds/" +
                build.id +
                "/download?schoolSlug=" +
                encodeURIComponent(schoolSlug)
              }
            >
              <Download className="size-4" />
              Download APK
            </a>
          </Button>
        )}
        {completed && (
          <Button asChild size="sm" variant="outline">
            <a
              href={
                "/api/v1/android-builds/" +
                build.id +
                "/download?format=aab&schoolSlug=" +
                encodeURIComponent(schoolSlug)
              }
            >
              <Download className="size-4" />
              Download Play Store AAB
            </a>
          </Button>
        )}
        {completed && <PackageCheck className="mt-2 size-4 text-emerald-600" />}
      </div>
    </div>
  );
}

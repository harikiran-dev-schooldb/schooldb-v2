"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2, Clock3, Download, ExternalLink, Loader2, PackageCheck,
  RefreshCw, Smartphone, UploadCloud, XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSchool } from "@/contexts/school-context";

type BuildItem = {
  id: string;
  status: "QUEUED" | "BUILDING" | "COMPLETED" | "FAILED";
  message: string | null;
  githubRunId: string | null;
  githubRunUrl: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  school: { id: string; name: string; slug: string };
  configuration: { flavorId: string; applicationId: string; appName: string };
};

const APPLICATION_ID = "com.schooldb.support";

export function AndroidAppBuilder() {
  const { school: currentSchool } = useSchool();
  const [builds, setBuilds] = useState<BuildItem[]>([]);
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
    const response = await fetch("/api/v1/android-builds", { cache: "no-store", headers });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.message ?? "Unable to load Android builds.");
    }
    setBuilds(payload.data.builds);
    setConfigured(payload.data.configured);
  }, [headers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      loadBuilds()
        .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load Android builds."))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBuilds]);

  const activeBuild = builds.some(
    (item) => item.status === "QUEUED" || item.status === "BUILDING",
  );

  useEffect(() => {
    if (!activeBuild) return;
    const timer = window.setInterval(() => void loadBuilds().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, [activeBuild, loadBuilds]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!firebaseConfig) {
      setError("Choose the shared google-services.json file.");
      return;
    }

    const body = new FormData();
    body.set("schoolId", currentSchool.id);
    body.set("firebaseConfig", firebaseConfig);

    try {
      setSubmitting(true);
      const response = await fetch("/api/v1/android-builds", { method: "POST", headers, body });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to start the Android build.");
      }
      setNotice("The universal signed Android app is now building in GitHub Actions.");
      setFirebaseConfig(null);
      await loadBuilds();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start the Android build.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Super Admin"
        title="School Support Android App"
        description="Build one shared School Support app for every school. Users choose their school code when signing in."
      />

      {!configured && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Add the GitHub Actions token to the web app environment before starting a build.</div>}
      {error && <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

      <form onSubmit={submit}>
        <Card className="max-w-3xl rounded-3xl border-0">
          <CardHeader>
            <CardTitle>Universal app release</CardTitle>
            <CardDescription>
              The package, name, colors, and SchoolDB Support logo stay the same for every school.
              A new school does not require another Android build.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2">
              <div><p className="text-xs font-medium text-muted-foreground">App name</p><p className="mt-1 font-semibold">School Support</p></div>
              <div><p className="text-xs font-medium text-muted-foreground">Application ID</p><p className="mt-1 font-mono text-sm">{APPLICATION_ID}</p></div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firebase-config">Shared Firebase configuration</Label>
              <Input id="firebase-config" type="file" accept="application/json,.json" onChange={(event) => setFirebaseConfig(event.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">google-services.json must include the Android client {APPLICATION_ID}.</p>
            </div>

            <Button type="submit" size="lg" disabled={submitting || activeBuild || !configured || !firebaseConfig}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              {submitting ? "Starting build..." : activeBuild ? "Build in progress" : "Build Universal App"}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card className="rounded-3xl border-0">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Build history</CardTitle>
            <CardDescription>New universal builds work for every school. Older school-specific builds remain listed for audit history.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadBuilds()}><RefreshCw className="size-4" />Refresh</Button>
        </CardHeader>
        <CardContent>
          {builds.length === 0 ? (
            <div className="rounded-2xl bg-muted/40 px-5 py-10 text-center">
              <Smartphone className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">No Android builds yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Upload the shared Firebase configuration to create the first universal release.</p>
            </div>
          ) : <div className="space-y-3">{builds.map((build) => <BuildRow key={build.id} build={build} schoolSlug={currentSchool.slug} />)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function BuildRow({ build, schoolSlug }: { build: BuildItem; schoolSlug: string }) {
  const running = build.status === "QUEUED" || build.status === "BUILDING";
  const completed = build.status === "COMPLETED";
  const failed = build.status === "FAILED";
  const Icon = completed ? CheckCircle2 : failed ? XCircle : running ? Loader2 : Clock3;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center">
      <div className={"flex size-11 shrink-0 items-center justify-center rounded-xl " + (completed ? "bg-emerald-50 text-emerald-700" : failed ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700")}>
        <Icon className={"size-5 " + (running ? "animate-spin" : "")} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{build.configuration.appName}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tracking-wide">{build.status}</span></div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{build.configuration.applicationId} · requested from {build.school.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{build.message || "Waiting for an update."} · {new Date(build.createdAt).toLocaleString()}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {build.githubRunUrl && <Button asChild variant="outline" size="sm"><a href={build.githubRunUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Logs</a></Button>}
        {completed && <Button asChild size="sm"><a href={`/api/v1/android-builds/${build.id}/download?schoolSlug=${encodeURIComponent(schoolSlug)}`}><Download className="size-4" />Download APK</a></Button>}
        {completed && <Button asChild size="sm" variant="outline"><a href={`/api/v1/android-builds/${build.id}/download?format=aab&schoolSlug=${encodeURIComponent(schoolSlug)}`}><Download className="size-4" />Download Play Store AAB</a></Button>}
        {completed && <PackageCheck className="mt-2 size-4 text-emerald-600" />}
      </div>
    </div>
  );
}

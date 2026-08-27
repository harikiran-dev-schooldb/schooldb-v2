"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [slugTouched, setSlugTouched] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  /*
   * --------------------------------------------------------------
   * Generate slug from school name
   * --------------------------------------------------------------
   */
  function handleNameChange(value: string) {
    setName(value);

    if (!slugTouched) {
      const generated = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-+/g, "-");

      setSlug(generated);
    }
  }

  async function createSchool() {
    setError(null);

    if (!name.trim()) {
      setError("School name is required.");
      return;
    }

    if (!slug.trim()) {
      setError("School URL is required.");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError(
        "School URL may contain only lowercase letters, numbers and hyphens.",
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/v1/onboarding/school", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to create school.");
      }

      setSuccess(true);

      const schoolSlug = payload.data.school.slug;

      /*
       * Give the success state a moment to render.
       */
      setTimeout(() => {
        router.replace(`/${schoolSlug}/dashboard`);
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create school.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          {/* ---------------------------------------------------------- */}
          {/* BRAND PANEL                                                */}
          {/* ---------------------------------------------------------- */}

          <div className="hidden rounded-3xl bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-foreground/10">
                <Building2 className="size-6" />
              </div>

              <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-primary-foreground/60">
                SchoolDB
              </p>

              <h1 className="mt-3 text-4xl font-bold tracking-tight">
                Set up your school.
              </h1>

              <p className="mt-4 max-w-md text-sm leading-6 text-primary-foreground/70">
                Create your school workspace and become its administrator.
              </p>
            </div>

            <div className="space-y-4">
              <Feature
                icon={<ShieldCheck className="size-4" />}
                title="Secure tenancy"
                description="Your school's data remains isolated."
              />

              <Feature
                icon={<CheckCircle2 className="size-4" />}
                title="Administrator access"
                description="You automatically become SUPER_ADMIN."
              />

              <Feature
                icon={<ArrowRight className="size-4" />}
                title="Ready to configure"
                description="Set up academic years and school data next."
              />
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* FORM                                                        */}
          {/* ---------------------------------------------------------- */}

          <Card className="premium-card overflow-hidden rounded-3xl border-0 shadow-xl">
            <CardHeader className="px-8 pb-4 pt-8">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </div>

              <CardTitle className="mt-5 text-2xl">
                Create your school
              </CardTitle>

              <p className="mt-2 text-sm text-muted-foreground">
                This will create your SchoolDB workspace.
              </p>
            </CardHeader>

            <CardContent className="space-y-6 px-8 pb-8">
              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

                  <div>
                    <p className="text-sm font-semibold text-destructive">
                      Unable to continue
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />

                  <div>
                    <p className="text-sm font-semibold">School created</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Your administrator account is ready. Redirecting to your
                      dashboard...
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="school-name" className="text-xs font-semibold">
                  School Name
                </label>

                <input
                  id="school-name"
                  value={name}
                  disabled={loading || success}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="e.g. ABC Public School"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="school-slug" className="text-xs font-semibold">
                  School URL
                </label>

                <div className="flex items-center rounded-xl border border-border bg-background focus-within:border-primary">
                  <span className="border-r border-border px-3 text-sm text-muted-foreground">
                    /
                  </span>

                  <input
                    id="school-slug"
                    value={slug}
                    disabled={loading || success}
                    onChange={(event) => {
                      setSlugTouched(true);

                      setSlug(
                        event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ""),
                      );
                    }}
                    placeholder="abc-public-school"
                    className="h-11 min-w-0 flex-1 rounded-r-xl bg-transparent px-3 text-sm outline-none disabled:opacity-50"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  This becomes your SchoolDB address.
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 text-primary" />

                  <div>
                    <p className="text-sm font-semibold">
                      You will become Super Admin
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      The Clerk account you&apos;re currently signed in with
                      will automatically receive SUPER_ADMIN membership for this
                      school.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="h-11 w-full rounded-xl"
                disabled={loading || success || !name.trim() || !slug.trim()}
                onClick={() => void createSchool()}
              >
                {loading && <Loader2 className="size-4 animate-spin" />}

                {loading
                  ? "Creating School..."
                  : success
                    ? "School Created"
                    : "Create School"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
        {icon}
      </div>

      <div>
        <p className="text-sm font-semibold">{title}</p>

        <p className="mt-1 text-xs text-primary-foreground/60">{description}</p>
      </div>
    </div>
  );
}

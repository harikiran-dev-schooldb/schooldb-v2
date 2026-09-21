"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserRoundPlus,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Step = "choice" | "admin" | "school";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choice");
  const [checking, setChecking] = useState(true);
  const [superAdminExists, setSuperAdminExists] = useState(false);

  const [clerkUserId, setClerkUserId] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/v1/onboarding/school", {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to check setup status.");
        }
        setSuperAdminExists(Boolean(payload.data.superAdminExists));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to check setup status.");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  function handleNameChange(value: string) {
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

  function continueWithAdmin() {
    setError(null);
    if (!clerkUserId.trim().startsWith("user_")) {
      setError("Enter a valid Clerk User ID beginning with user_.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setStep("school");
  }

  async function createSchool() {
    setError(null);

    if (!name.trim() || !slug.trim()) {
      setError("School name and School URL are required.");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("School URL may contain only lowercase letters, numbers and hyphens.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/v1/onboarding/school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkUserId: clerkUserId.trim(),
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: name.trim(),
          slug: slug.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to complete setup.");
      }

      setSuccess(true);
      setTimeout(() => router.replace(`/${payload.data.school.slug}/dashboard`), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete setup.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden rounded-3xl bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-foreground/10">
                <Building2 className="size-6" />
              </div>
              <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-primary-foreground/60">SchoolDB</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">Initial setup.</h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-primary-foreground/70">
                Bootstrap the first Super Admin and create your first school workspace.
              </p>
            </div>

            <div className="space-y-4">
              <Feature icon={<KeyRound className="size-4" />} title="Clerk identity" description="Use the Clerk User ID that should own the first workspace." />
              <Feature icon={<ShieldCheck className="size-4" />} title="One-time bootstrap" description="Only available while no active SUPER_ADMIN exists." />
              <Feature icon={<ArrowRight className="size-4" />} title="Ready to configure" description="Set up academic years and school data next." />
            </div>
          </div>

          <Card className="premium-card overflow-hidden rounded-3xl border-0 shadow-xl">
            <CardHeader className="px-8 pb-4 pt-8">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {step === "admin" ? <UserRoundPlus className="size-5" /> : <Building2 className="size-5" />}
              </div>
              <CardTitle className="mt-5 text-2xl">
                {superAdminExists ? "SchoolDB is already configured" : step === "choice" ? "Initial SchoolDB setup" : step === "admin" ? "Super Administrator" : "Create your first school"}
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {superAdminExists
                  ? "An active SUPER_ADMIN already exists."
                  : step === "choice"
                    ? "First, tell us whether you already have a Clerk User ID."
                    : step === "admin"
                      ? "Enter the Clerk identity that should become the first SUPER_ADMIN."
                      : "Create the school that will own the initial SUPER_ADMIN membership."}
              </p>
            </CardHeader>

            <CardContent className="space-y-6 px-8 pb-8">
              {checking && (
                <div className="flex items-center gap-3 rounded-2xl border p-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Checking SchoolDB setup...
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Unable to continue</p>
                    <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
              )}

              {!checking && superAdminExists && (
                <div className="rounded-2xl border bg-muted/30 p-5">
                  <p className="text-sm font-semibold">Initial setup is complete</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Sign in with the existing Super Admin account. This page will not create another initial SUPER_ADMIN.
                  </p>
                </div>
              )}

              {!checking && !superAdminExists && step === "choice" && (
                <>
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                    <p className="text-sm font-semibold">Do you already have a Clerk User ID?</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      You can copy it from the Clerk dashboard. It begins with user_.
                    </p>
                  </div>
                  <Button className="h-11 w-full rounded-xl" onClick={() => setStep("admin")}>
                    Yes, I have a Clerk User ID <ArrowRight className="size-4" />
                  </Button>
                  <Button className="h-11 w-full rounded-xl" variant="outline" onClick={() => router.push("/login")}>
                    No, sign in or create a Clerk account
                  </Button>
                </>
              )}

              {!checking && !superAdminExists && step === "admin" && (
                <>
                  <Field label="Clerk User ID" value={clerkUserId} onChange={setClerkUserId} placeholder="user_..." />
                  <Field label="Email" value={email} onChange={setEmail} placeholder="admin@school.com" type="email" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="First name" />
                    <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Last name (optional)" />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => setStep("choice")}>Back</Button>
                    <Button className="h-11 flex-1 rounded-xl" onClick={continueWithAdmin}>Continue <ArrowRight className="size-4" /></Button>
                  </div>
                </>
              )}

              {!checking && !superAdminExists && step === "school" && (
                <>
                  {success && (
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="text-sm font-semibold">Initial setup complete</p>
                        <p className="mt-1 text-sm text-muted-foreground">Super Admin and school created. Redirecting...</p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground">SUPER_ADMIN</p>
                    <p className="mt-1 text-sm font-semibold">{firstName} {lastName}</p>
                    <p className="text-xs text-muted-foreground">{email} · {clerkUserId}</p>
                  </div>

                  <Field label="School Name" value={name} onChange={handleNameChange} placeholder="e.g. Kotak Salesian School" disabled={loading || success} />

                  <div className="space-y-2">
                    <label htmlFor="school-slug" className="text-xs font-semibold">School URL</label>
                    <div className="flex items-center rounded-xl border border-border bg-background focus-within:border-primary">
                      <span className="border-r border-border px-3 text-sm text-muted-foreground">/</span>
                      <input
                        id="school-slug"
                        value={slug}
                        disabled={loading || success}
                        onChange={(event) => {
                          setSlugTouched(true);
                          setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                        }}
                        placeholder="kotak-vsp"
                        className="h-11 min-w-0 flex-1 rounded-r-xl bg-transparent px-3 text-sm outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="h-11 flex-1 rounded-xl" disabled={loading || success} onClick={() => setStep("admin")}>Back</Button>
                    <Button className="h-11 flex-[2] rounded-xl" disabled={loading || success || !name.trim() || !slug.trim()} onClick={() => void createSchool()}>
                      {loading && <Loader2 className="size-4 animate-spin" />}
                      {loading ? "Creating..." : success ? "Setup Complete" : "Create SchoolDB Workspace"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  disabled?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-semibold">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
      />
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">{icon}</div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-primary-foreground/60">{description}</p>
      </div>
    </div>
  );
}

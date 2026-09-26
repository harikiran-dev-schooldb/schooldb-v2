"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ArrowRight, Link2, ShieldCheck } from "lucide-react";

const SCHOOL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function ChooseSchoolPage() {
  const router = useRouter();
  const [schoolSlug, setSchoolSlug] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const slug = schoolSlug.trim().toLowerCase().replace(/^\/+|\/+$/g, "");

    if (!SCHOOL_SLUG_PATTERN.test(slug)) {
      setError("Enter a valid school slug, such as demo-school.");
      return;
    }

    router.push(`/${slug}/login`);
  };

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/70 to-violet-50 px-4 py-8 sm:py-12">
      <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-indigo-300/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-violet-300/15 blur-3xl" />

      <div className="relative mx-auto w-full max-w-lg">
        <header className="text-center">
          <Image
            src="/pwa-192.png"
            alt="SchoolDB"
            width={72}
            height={72}
            className="mx-auto rounded-2xl shadow-xl shadow-indigo-950/15"
            priority
          />
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            SchoolDB mobile workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Enter your school slug
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Use the unique name from your school&apos;s SchoolDB address to open
            its secure login page.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8"
        >
          <label
            htmlFor="school-slug"
            className="text-sm font-bold text-foreground"
          >
            School slug
          </label>
          <div className="mt-3 flex items-center overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
            <span className="flex h-14 items-center gap-2 border-r border-border bg-muted/60 px-4 text-sm text-muted-foreground">
              <Link2 className="size-4" />
              /
            </span>
            <input
              id="school-slug"
              name="schoolSlug"
              value={schoolSlug}
              onChange={(event) => {
                setSchoolSlug(event.target.value);
                if (error) setError("");
              }}
              placeholder="demo-school"
              autoCapitalize="none"
              autoComplete="organization"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "school-slug-error" : undefined}
              className="h-14 min-w-0 flex-1 bg-transparent px-4 text-base font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
              autoFocus
            />
            <span className="hidden pr-4 text-sm text-muted-foreground sm:inline">
              /login
            </span>
          </div>

          {error ? (
            <p id="school-slug-error" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Example: for /demo-school/login, enter demo-school.
            </p>
          )}

          <button
            type="submit"
            disabled={!schoolSlug.trim()}
            className="group mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-[0_18px_38px_rgba(79,70,229,0.25)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            Continue to school login
            <ArrowRight className="size-4 opacity-70 transition-transform group-hover:translate-x-1" />
          </button>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            You&apos;ll sign in securely on your school&apos;s page.
          </p>
        </form>
      </div>
    </main>
  );
}

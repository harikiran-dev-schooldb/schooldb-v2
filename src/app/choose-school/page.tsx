"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Link2,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const SCHOOL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type SchoolBrand = { name: string; slug: string; logo: string | null };

export default function ChooseSchoolPage() {
  const router = useRouter();
  const [schoolSlug, setSchoolSlug] = useState("");
  const [error, setError] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [schoolBrand, setSchoolBrand] = useState<SchoolBrand | null>(null);
  const normalizedSlug = schoolSlug.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  const schoolReady = SCHOOL_SLUG_PATTERN.test(normalizedSlug);
  const visibleBrand = schoolBrand?.slug === normalizedSlug ? schoolBrand : null;

  useEffect(() => {
    if (!SCHOOL_SLUG_PATTERN.test(normalizedSlug)) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/v1/public/schools/${encodeURIComponent(normalizedSlug)}/branding`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          data?: { school?: SchoolBrand };
        };
        if (payload.data?.school) setSchoolBrand(payload.data.school);
      } catch (fetchError) {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          console.error("Unable to load school branding", fetchError);
        }
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedSlug]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const slug = normalizedSlug;

    if (!SCHOOL_SLUG_PATTERN.test(slug)) {
      setError("Enter a valid school slug, such as demo-school.");
      return;
    }

    if (isTransitioning) return;

    setIsTransitioning(true);
    window.sessionStorage.setItem("schooldb-school-transition", slug);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => router.push(`/${slug}/login`), reduceMotion ? 80 : 820);
  };

  return (
    <main className="schooldb-choose-scene relative flex min-h-screen items-center overflow-hidden bg-[#f7f8ff] px-4 py-8 sm:py-12">
      <div className="schooldb-choose-mesh pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className={"schooldb-portal pointer-events-none absolute left-1/2 top-1/2 size-[680px] -translate-x-1/2 -translate-y-1/2 sm:size-[820px] " + (schoolReady ? "is-ready " : "") + (isTransitioning ? "is-transitioning" : "")} aria-hidden="true">
        <div className="schooldb-portal-ring schooldb-portal-ring-one absolute inset-[12%] rounded-full border border-indigo-300/30" />
        <div className="schooldb-portal-ring schooldb-portal-ring-two absolute inset-[24%] rounded-full border border-violet-300/30" />
        <div className="schooldb-portal-ring schooldb-portal-ring-three absolute inset-[36%] rounded-full border border-blue-300/30" />
        <div className="schooldb-portal-scan absolute inset-[8%] rounded-full" />
        <span className="schooldb-portal-node schooldb-portal-node-one" />
        <span className="schooldb-portal-node schooldb-portal-node-two" />
        <span className="schooldb-portal-node schooldb-portal-node-three" />
        <span className="schooldb-portal-particle schooldb-portal-particle-one" />
        <span className="schooldb-portal-particle schooldb-portal-particle-two" />
        <span className="schooldb-portal-particle schooldb-portal-particle-three" />
        <span className="schooldb-portal-particle schooldb-portal-particle-four" />
      </div>
      <div className="schooldb-portal-pulse pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/30" aria-hidden="true" />

      <div
        className={"schooldb-school-transition pointer-events-none fixed inset-0 z-50 flex items-center justify-center " + (isTransitioning ? "is-active" : "")}
        aria-hidden="true"
      >
        <div className="schooldb-school-transition-halo absolute size-40 rounded-full" />
        <div className="schooldb-school-transition-identity relative flex flex-col items-center text-center">
          <Image
            src={visibleBrand?.logo || "/pwa-192.png"}
            alt=""
            width={88}
            height={88}
            className="size-[88px] rounded-[24px] bg-white object-contain p-1.5 shadow-[0_24px_70px_rgba(30,27,75,.28)]"
          />
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-200">
            Opening secure portal
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-white">
            {visibleBrand?.name || normalizedSlug || "Your school"}
          </p>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <header className="schooldb-choose-intro text-center">
          <Image
            src={visibleBrand?.logo || "/pwa-192.png"}
            alt={visibleBrand ? `${visibleBrand.name} logo` : "SchoolDB"}
            width={72}
            height={72}
            className="schooldb-choose-logo mx-auto size-[72px] rounded-2xl bg-white object-contain p-1 shadow-xl shadow-indigo-950/15"
            priority
          />
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700 shadow-sm backdrop-blur-xl">
            <Sparkles className="size-3.5" />
            SchoolDB secure workspace
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
          className={"schooldb-choose-card relative mt-8 overflow-hidden rounded-3xl border border-white bg-white/90 p-6 shadow-[0_30px_80px_rgba(79,70,229,.13),0_8px_28px_rgba(15,23,42,.05)] backdrop-blur-xl sm:p-8 " + (schoolReady ? "is-ready" : "")}
        >
          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
          <label
            htmlFor="school-slug"
            className="text-sm font-bold text-foreground"
          >
            School slug
          </label>
          <div className={"mt-3 flex items-center overflow-hidden rounded-2xl border bg-background shadow-sm transition focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 " + (schoolReady ? "border-emerald-300 ring-4 ring-emerald-100/70" : "border-border")}>
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
            <span className="hidden items-center gap-2 pr-4 text-sm text-muted-foreground sm:flex">
              /login
              {schoolReady && <CheckCircle2 className="size-4 text-emerald-500" />}
            </span>
          </div>

          {error ? (
            <p id="school-slug-error" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          ) : schoolReady ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="size-3.5" />
              School address is ready.
            </p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Example: for /demo-school/login, enter demo-school.
            </p>
          )}

          <button
            type="submit"
            disabled={!schoolSlug.trim() || isTransitioning}
            className="schooldb-choose-action group relative mt-6 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 bg-[length:200%_100%] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(79,70,229,.22)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(79,70,229,.25)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isTransitioning ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Opening secure portal
              </>
            ) : (
              <>
                Continue to school login
                <ArrowRight className="size-4 opacity-70 transition-transform group-hover:translate-x-1" />
              </>
            )}
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

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";

import { publicBusiness } from "@/lib/public-business";

const policyLinks = [
  ["About", "/about"],
  ["Contact", "/contact"],
  ["Privacy", "/privacy-policy"],
  ["Terms", "/terms"],
  ["Refunds", "/refund-policy"],
] as const;

export function PublicSiteShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950">
      <header className="border-b border-slate-200/70 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_8px_22px_rgba(79,70,229,0.20)]">
              <GraduationCap className="size-5" strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-[17px] font-bold tracking-tight">
                SchoolDB
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-600">
                School Operations
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/contact"
              className="hidden rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 sm:block"
            >
              Contact
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,0.18)] hover:bg-indigo-700"
            >
              Login <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-slate-200 bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="text-sm font-bold text-slate-800">
              {publicBusiness.brandName}
            </div>
            <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
              A school operations platform provided by{" "}
              {publicBusiness.legalName}.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Udyam: {publicBusiness.udyamNumber}
            </p>
          </div>
          <nav
            aria-label="Company and policy links"
            className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs font-semibold text-slate-600"
          >
            {policyLinks.map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-indigo-600">
                {label}
              </Link>
            ))}
          </nav>
          <div className="text-xs leading-5 text-slate-500">
            <a
              href={`mailto:${publicBusiness.email}`}
              className="block hover:text-indigo-600"
            >
              {publicBusiness.email}
            </a>
            <a
              href={`tel:${publicBusiness.phoneHref}`}
              className="mt-1 block hover:text-indigo-600"
            >
              {publicBusiness.phone}
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

export function PublicPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <PublicSiteShell>
      <section className="border-b border-slate-200/70 bg-white px-5 py-14 sm:px-8 sm:py-18">
        <div className="mx-auto max-w-4xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.035em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">
            {intro}
          </p>
        </div>
      </section>
      <section className="px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-4xl space-y-5">{children}</div>
      </section>
    </PublicSiteShell>
  );
}

export function ContentCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-8">
      <h2 className="text-lg font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
        {children}
      </div>
    </section>
  );
}

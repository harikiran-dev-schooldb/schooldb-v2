import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileLock2,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import {
  ContentCard,
  PublicPage,
} from "@/components/public-site/PublicSiteShell";
import { publicBusiness } from "@/lib/public-business";

export const metadata: Metadata = {
  title: "Data Security & Trust | SchoolDB",
  description:
    "Learn how SchoolDB approaches authentication, school data boundaries, role-based access, private files, audit records and shared security responsibilities.",
};

const controls = [
  [
    Fingerprint,
    "Authenticated access",
    "Protected workspaces and APIs require an authenticated user session before school data is evaluated.",
  ],
  [
    UsersRound,
    "School membership boundaries",
    "An active membership connects each user to a specific school before operational records are returned.",
  ],
  [
    KeyRound,
    "Role and permission checks",
    "Administrative, teaching, finance, reception and self-service roles receive different capabilities.",
  ],
  [
    FileLock2,
    "Private file delivery",
    "Sensitive uploads use private storage controls and authenticated download routes rather than public file links.",
  ],
  [
    ClipboardCheck,
    "Operational audit records",
    "Important actions can record the actor, school, role, module, action and affected record for review.",
  ],
  [
    ServerCog,
    "Application safeguards",
    "Input validation, file type and size checks, security headers and server-side data scoping reduce common risks.",
  ],
] as const;

export default function SecurityPage() {
  return (
    <PublicPage
      eyebrow="Data security & trust"
      title="Clear boundaries around school data."
      intro="SchoolDB uses layered application controls to authenticate users, resolve their school and role, restrict records, protect uploaded files and preserve operational accountability."
    >
      <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/70 p-6 shadow-[0_12px_38px_rgba(79,70,229,0.08)] sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.22)]">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
              Security approach
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Access is checked in context, not assumed.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Signing in is only the first step. SchoolDB also evaluates the
              user&apos;s active school membership, role, permissions and the
              requested record before allowing protected operations.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {controls.map(([Icon, title, text]) => (
          <article
            key={title}
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Icon className="size-5" />
            </span>
            <h2 className="mt-5 text-base font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </article>
        ))}
      </div>

      <ContentCard title="How a protected request is evaluated">
        <ol className="grid gap-3 sm:grid-cols-2">
          {[
            ["01", "Authenticate", "Confirm that a valid user session is present."],
            ["02", "Resolve school", "Require an active membership for the requested school."],
            ["03", "Check authority", "Apply role, permission and resource-specific rules."],
            ["04", "Scope the data", "Query and return records within that school context."],
          ].map(([number, title, text]) => (
            <li
              key={number}
              className="flex gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-4"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-[10px] font-black text-white">
                {number}
              </span>
              <span>
                <strong className="block text-slate-900">{title}</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {text}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </ContentCard>

      <div className="grid gap-5 md:grid-cols-2">
        <ContentCard title="How SchoolDB handles data">
          <ul className="list-disc space-y-2 pl-5">
            <li>Schools determine which institutional records are entered.</li>
            <li>Personal information is not sold.</li>
            <li>
              Service providers are used where needed for hosting,
              authentication, storage, communications and payments.
            </li>
            <li>
              Payment reconciliation uses transaction references and status;
              SchoolDB does not store UPI PINs or banking passwords.
            </li>
          </ul>
          <Link
            href="/privacy-policy"
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Read the privacy policy <ArrowRight className="size-3.5" />
          </Link>
        </ContentCard>

        <ContentCard title="Shared responsibility">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Schools should approve access only for authorised users and
              promptly remove access that is no longer required.
            </li>
            <li>
              Users should protect sign-in methods, devices and verification
              codes and report suspected misuse promptly.
            </li>
            <li>
              Schools remain responsible for lawful collection, accuracy,
              retention requirements and day-to-day use of their records.
            </li>
          </ul>
        </ContentCard>
      </div>

      <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.15)] sm:p-8">
        <LockKeyhole className="size-6 text-indigo-300" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          Report a privacy or security concern
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Contact us with the school name, a clear description and a safe way
          to reach you. Do not email passwords, OTPs, UPI PINs or unnecessary
          student records.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={`mailto:${publicBusiness.email}?subject=SchoolDB%20security%20concern`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-400"
          >
            Email security concern <ArrowRight className="size-4" />
          </a>
          <Link
            href="/faq"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"
          >
            Read common questions
          </Link>
        </div>
      </section>

      <p className="px-2 text-xs leading-5 text-slate-500">
        No internet service can guarantee absolute security. This page describes
        SchoolDB&apos;s application approach and does not claim a third-party
        certification or an unconditional guarantee.
      </p>
    </PublicPage>
  );
}

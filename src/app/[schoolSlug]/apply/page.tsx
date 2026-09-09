import { ArrowLeft, GraduationCap, Search, Sparkles } from "lucide-react";
import Link from "next/link";

import { PublicAdmissionForm } from "@/features/admissions/PublicAdmissionForm";
import { admissionPublicOptions } from "@/features/admissions/admission.service";

export default async function OnlineAdmissionPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const school = await admissionPublicOptions(schoolSlug);
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_38%),linear-gradient(180deg,#ffffff,#f8fafc)] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link
            href={`/${schoolSlug}/login`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"
          >
            <ArrowLeft className="size-4" />
            Back to login
          </Link>
          <Link
            href={`/${schoolSlug}/apply/track`}
            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700"
          >
            <Search className="size-4" />
            Track application
          </Link>
        </div>
        <header className="mt-7 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-7 text-white shadow-2xl shadow-indigo-900/15 sm:p-10">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <GraduationCap className="size-7 text-indigo-200" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.24em] text-indigo-200 uppercase">
                Online admissions
              </p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                {school.name}
              </h1>
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-indigo-100">
            <Sparkles className="size-4" />
            Start your child&apos;s admission application in a few minutes.
          </div>
        </header>
        <section className="mt-6 rounded-[2rem] border border-white bg-white/95 p-5 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8">
          <PublicAdmissionForm schoolSlug={schoolSlug} school={school} />
        </section>
        <p className="py-7 text-center text-xs text-slate-400">
          Powered by SchoolDB · Secure online admissions
        </p>
      </div>
    </main>
  );
}

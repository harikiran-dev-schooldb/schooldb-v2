import { ArrowLeft, SearchCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdmissionTracker } from "@/features/admissions/AdmissionTracker";
import { prisma } from "@/lib/prisma";

export default async function TrackAdmissionPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { name: true },
  });
  if (!school) notFound();
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/${schoolSlug}/apply`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
        >
          <ArrowLeft className="size-4" />
          New application
        </Link>
        <section className="mt-6 rounded-[2rem] border bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <SearchCheck className="size-6" />
          </div>
          <p className="mt-5 text-xs font-bold tracking-[0.2em] text-indigo-600 uppercase">
            {school.name}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Track admission
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter the application number and parent or guardian mobile used
            during submission.
          </p>
          <div className="mt-7">
            <AdmissionTracker schoolSlug={schoolSlug} />
          </div>
        </section>
      </div>
    </main>
  );
}

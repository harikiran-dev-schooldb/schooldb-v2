import { notFound } from "next/navigation";
import { ApiError } from "@/lib/errors";
import { parentSupportSchool } from "@/lib/parent-support";
import { ParentQueryForm } from "./parent-query-form";

export const metadata = { robots: { index: false, follow: false } };

export default async function ParentQueryPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const school = await parentSupportSchool(schoolSlug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="rounded-3xl bg-gradient-to-br from-slate-950 to-indigo-900 p-7 text-white shadow-xl sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Parent support</p>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Ask {school.name} a question</h1>
          <p className="mt-3 text-sm leading-6 text-indigo-100">
            Choose your child, describe your query, and send it to the principal and school administration. No login is needed.
          </p>
        </header>
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <ParentQueryForm schoolSlug={schoolSlug} classes={school.classes} />
        </section>
        <p className="mt-6 text-center text-xs text-slate-500">Powered by SchoolDB</p>
      </div>
    </main>
  );
}

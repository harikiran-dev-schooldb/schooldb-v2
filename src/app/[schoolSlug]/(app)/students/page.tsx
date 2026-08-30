import { PageHeader } from "@/components/common/PageHeader";
import { AddStudentButton } from "@/features/students/components/AddStudentButton";
import { StudentTable } from "@/features/students/components/StudentTable";
import { GraduationCap, Users, Sparkles } from "lucide-react";

export default function StudentPage() {
  return (
    <div className="space-y-7 pb-10">
      {/* ======================================================================
          PAGE HEADER
          ====================================================================== */}

      <PageHeader
        title="Students"
        description="Manage student records, admissions, enrollment details, and academic information."
        action={<AddStudentButton />}
      />

      {/* ======================================================================
          PREMIUM LIGHT MODULE HERO
          ====================================================================== */}

      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/60 px-6 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] md:px-8 md:py-7">
        {/* Decorative background glow */}

        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-violet-400/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="pointer-events-none absolute right-1/4 top-1/2 size-40 -translate-y-1/2 rounded-full bg-indigo-400/5 blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          {/* ------------------------------------------------------------------
              LEFT CONTENT
              ------------------------------------------------------------------ */}

          <div className="flex items-start gap-4">
            {/* Icon */}

            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-[0_10px_25px_rgba(79,70,229,0.20)] ring-1 ring-indigo-500/10">
              <GraduationCap className="size-6" strokeWidth={2} />
            </div>

            <div className="min-w-0">
              {/* Label */}

              <div className="flex items-center gap-2">
                <Sparkles className="size-3 text-indigo-500" />

                <p className="text-[10px] font-bold tracking-[0.2em] text-indigo-600 uppercase">
                  Student Management
                </p>
              </div>

              {/* Heading */}

              <h2 className="mt-2 text-xl font-bold tracking-[-0.025em] text-slate-950 md:text-2xl">
                Your complete student directory
              </h2>

              {/* Description */}

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Search, review, and manage student information from one
                centralized workspace.
              </p>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              RIGHT INFO CARD
              ------------------------------------------------------------------ */}

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-indigo-100 bg-white/85 px-4 py-3 shadow-[0_10px_30px_rgba(79,70,229,0.07)] backdrop-blur-xl">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Users className="size-4" strokeWidth={2} />
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">
                Student Records
              </p>

              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                Manage with confidence
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          MAIN DATA WORKSPACE
          ====================================================================== */}

      <section className="premium-card overflow-hidden rounded-3xl bg-white">
        <StudentTable />
      </section>
    </div>
  );
}

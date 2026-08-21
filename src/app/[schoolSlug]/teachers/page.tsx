import { PageHeader } from "@/components/common/PageHeader";
import { AddTeacherButton } from "@/features/teachers/components/AddTeacherButton";
import { TeacherTable } from "@/features/teachers/components/TeacherTable";
import { GraduationCap, Users, Search, ShieldCheck } from "lucide-react";

export default function TeachersPage() {
  return (
    <div className="space-y-8 pb-6">
      <PageHeader
        title="Teachers"
        description="Manage school teachers and their associated information."
        action={<AddTeacherButton />}
      />

      {/* Premium module banner */}
      <section className="premium-hero px-6 py-7 md:px-8 md:py-9">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-lg backdrop-blur-xl">
              <GraduationCap className="size-6 text-teal-300" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">
                Teacher Management
              </p>

              <h2 className="mt-2 text-xl font-bold tracking-tight text-white md:text-2xl">
                Your complete teacher directory
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Search, review, and manage teacher information from one
                centralized workspace.
              </p>
            </div>
          </div>

          {/* Feature indicators */}
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
              <div className="flex size-9 items-center justify-center rounded-xl bg-teal-400/10">
                <Users className="size-4 text-teal-300" />
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Records
                </p>
                <p className="text-sm font-bold text-white">Centralized</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-400/10">
                <ShieldCheck className="size-4 text-blue-300" />
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Workspace
                </p>
                <p className="text-sm font-bold text-white">Organized</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Teacher data workspace */}
      <section className="premium-card overflow-hidden rounded-3xl">
        {/* Workspace heading */}
        <div className="flex flex-col gap-4 border-b border-slate-200/70 bg-white/40 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Search className="size-4 text-primary" />
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">
                Teacher Directory
              </p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Search and manage your school teaching staff
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Records synchronized
          </div>
        </div>

        {/* Table area */}
        <div className="p-3 md:p-5">
          <TeacherTable />
        </div>
      </section>
    </div>
  );
}

import { PageHeader } from "@/components/common/PageHeader";
import { AddStudentButton } from "@/features/students/components/AddStudentButton";
import { StudentTable } from "@/features/students/components/StudentTable";
import { GraduationCap, Users } from "lucide-react";

export default function StudentPage() {
  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Students"
        description="Manage student records, admissions, enrollment details, and academic information."
        action={<AddStudentButton />}
      />

      {/* Premium module banner */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-2xl shadow-slate-900/15 md:p-8">
        {/* Decorative glow */}
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 size-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-lg backdrop-blur-xl">
              <GraduationCap className="size-6 text-teal-300" />
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-teal-300 uppercase">
                Student Management
              </p>

              <h2 className="mt-2 text-xl font-bold tracking-tight md:text-2xl">
                Your complete student directory
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Search, review, and manage student information from one
                centralized workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-400/10">
              <Users className="size-4 text-teal-300" />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                Student Records
              </p>
              <p className="text-sm font-bold text-white">
                Manage with confidence
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main data workspace */}
      <section className="premium-card overflow-hidden rounded-3xl">
        <StudentTable />
      </section>
    </div>
  );
}

import { PageHeader } from "@/components/common/PageHeader";
import { AddFeePlanButton } from "@/features/fees/components/AddFeePlanButton";
import { FeePlanTable } from "@/features/fees/components/FeePlanTable";
import { ClipboardList, Settings2 } from "lucide-react";

export default function FeePlanPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* ================================================================ */}
      {/* PAGE HEADER                                                       */}
      {/* ================================================================ */}

      <PageHeader
        title="Fee Plans"
        description="Manage fee plans and installment schedules for the school."
        action={<AddFeePlanButton />}
      />

      {/* ================================================================ */}
      {/* MODULE BANNER                                                     */}
      {/* ================================================================ */}

      <section className="premium-card relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-6 py-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] md:px-8 md:py-7">
        {/* Decorative light glows */}
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Description */}
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-200/60 bg-white shadow-sm">
              <ClipboardList className="size-6 text-indigo-600" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">
                Fee Management
              </p>

              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                Manage your school fee structure
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Create fee plans, configure installment schedules, and manage
                the fees assigned to your students.
              </p>
            </div>
          </div>

          {/* Feature indicator */}
          <div className="flex w-fit items-center gap-3 rounded-2xl border border-indigo-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl">
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50">
              <Settings2 className="size-4 text-indigo-600" />
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Configuration
              </p>

              <p className="text-sm font-bold text-slate-800">
                Fee Plans & Installments
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FEE PLAN WORKSPACE                                                */}
      {/* ================================================================ */}

      <section className="premium-card overflow-hidden rounded-3xl">
        <div className="border-b border-border/60 bg-muted/20 px-5 py-5 md:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <ClipboardList className="size-4 text-primary" />
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight">
                Fee Plan Directory
              </p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                View and manage fee plans and their installment schedules.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <FeePlanTable />
        </div>
      </section>
    </div>
  );
}

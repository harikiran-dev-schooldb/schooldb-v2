import { SignUp } from "@clerk/nextjs";
import { KeyRound } from "lucide-react";

import {
  AuthPolicyLinks,
  SchoolDbIdentity,
} from "@/components/branding/SchoolDbIdentity";

export default function RegisterPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f7ff] px-4 py-6 text-slate-950 sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -left-32 -top-40 size-[32rem] rounded-full bg-indigo-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 size-[34rem] rounded-full bg-violet-200/40 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header>
          <SchoolDbIdentity />
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1fr_auto] lg:py-10">
          <section className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
            <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-[0_12px_30px_rgba(79,70,229,0.24)] lg:mx-0">
              <KeyRound className="size-5" />
            </span>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">
              Initial owner registration
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
              Create the account that will start SchoolDB.
            </h1>
            <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
              This registration is only for the first system owner during initial
              setup. School administrators, teachers, staff, parents and students
              receive access from their school and should use the school login page.
            </p>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-left text-xs leading-5 text-amber-900">
              Do not create a second owner account for an existing school. Ask the
              current Super Admin to create or restore the correct school access.
            </div>
          </section>

          <section className="flex justify-center lg:min-w-[420px] lg:justify-end" aria-label="Create SchoolDB owner account">
            <SignUp
              forceRedirectUrl="/onboarding"
              fallbackRedirectUrl="/onboarding"
            />
          </section>
        </div>

        <AuthPolicyLinks message="Secure owner registration" className="pb-2" />
      </div>
    </main>
  );
}

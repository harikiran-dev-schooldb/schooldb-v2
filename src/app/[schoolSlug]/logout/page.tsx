"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { GraduationCap, LogOut, ShieldCheck } from "lucide-react";

export default function LogoutPage() {
  const { signOut } = useClerk();

  const params = useParams<{ schoolSlug: string }>();
  const schoolSlug = params.schoolSlug;

  useEffect(() => {
    if (!schoolSlug) return;

    const logout = async () => {
      await signOut({
        redirectUrl: `/${schoolSlug}/login`,
      });
    };

    void logout();
  }, [schoolSlug, signOut]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-100 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-100 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>

          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
            <LogOut className="h-5 w-5 text-blue-600" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Signing you out
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Please wait while we securely end your SchoolDB session.
          </p>

          <div className="mx-auto mt-7 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4" />
            Securely signing you out
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} SchoolDB. All rights reserved.
        </p>
      </div>
    </main>
  );
}

"use client";

import { SignIn } from "@clerk/nextjs";
import {
  BarChart3,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

type PremiumSignInProps = {
  schoolSlug?: string;
};

export function PremiumSignIn({ schoolSlug }: PremiumSignInProps) {
  const dashboardUrl = schoolSlug ? `/${schoolSlug}/dashboard` : "/dashboard";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-100 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-100 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-50 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-2">
          {/* Left side */}
          <section className="hidden flex-col justify-between bg-slate-50 p-10 lg:flex xl:p-14">
            <div>
              {/* Logo */}
              <div className="mb-12 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>

                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    SchoolDB
                  </h1>

                  <p className="text-xs text-slate-500">
                    School Management Platform
                  </p>
                </div>
              </div>

              {/* Heading */}
              <div className="max-w-lg">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Welcome back
                </p>

                <h2 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 xl:text-5xl">
                  Manage your school
                  <span className="block text-blue-600">smarter.</span>
                </h2>

                <p className="mt-6 max-w-md text-base leading-7 text-slate-500">
                  One powerful platform for students, teachers, attendance,
                  fees, academics and complete school administration.
                </p>
              </div>

              {/* Features */}
              <div className="mt-10 space-y-5">
                <Feature
                  icon={ShieldCheck}
                  title="Secure & Reliable"
                  description="Your school data stays protected."
                />

                <Feature
                  icon={BarChart3}
                  title="Powerful Analytics"
                  description="Make better decisions with real-time insights."
                />

                <Feature
                  icon={CheckCircle2}
                  title="Everything in One Place"
                  description="Manage your entire school from one platform."
                />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} SchoolDB. All rights reserved.
            </p>
          </section>

          {/* Right side */}
          <section className="flex items-center justify-center bg-white p-6 sm:p-10 lg:p-14">
            <div className="w-full max-w-md">
              {/* Mobile logo */}
              <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-600/20">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>

                <div>
                  <h1 className="font-bold text-slate-900">SchoolDB</h1>

                  <p className="text-xs text-slate-500">
                    School Management Platform
                  </p>
                </div>
              </div>

              {/* Heading */}
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Sign in to SchoolDB
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Access your school management dashboard
                </p>
              </div>

              <SignIn
                forceRedirectUrl={dashboardUrl}
                fallbackRedirectUrl={dashboardUrl}
                appearance={{
                  variables: {
                    colorPrimary: "#2563eb",
                    colorBackground: "#ffffff",
                    colorForeground: "#0f172a",
                    colorMutedForeground: "#64748b",
                    colorInput: "#ffffff",
                    colorInputForeground: "#0f172a",
                    borderRadius: "0.75rem",
                  },

                  elements: {
                    rootBox: "w-full",
                    card: "w-full bg-transparent shadow-none border-0 p-0",

                    headerTitle: "hidden",
                    headerSubtitle: "hidden",

                    socialButtonsBlockButton:
                      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",

                    socialButtonsBlockButtonText: "text-slate-700 font-medium",

                    formFieldLabel: "text-sm font-medium text-slate-700",

                    formFieldInput:
                      "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",

                    formButtonPrimary:
                      "bg-blue-600 text-white shadow-md shadow-blue-600/20 hover:bg-blue-700",

                    footerActionLink:
                      "font-medium text-blue-600 hover:text-blue-700",

                    identityPreviewText: "text-slate-900",

                    formFieldSuccessText: "text-emerald-600",

                    formFieldErrorText: "text-red-600",

                    alert: "border border-slate-200 bg-slate-50 text-slate-700",
                  },
                }}
              />

              <p className="mt-7 text-center text-xs leading-5 text-slate-400">
                By continuing, you agree to our{" "}
                <span className="text-slate-500">Terms of Service</span> and{" "}
                <span className="text-slate-500">Privacy Policy</span>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>

        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

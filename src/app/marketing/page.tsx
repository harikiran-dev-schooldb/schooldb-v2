import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  Layers3,
  ShieldCheck,
  Sparkles,
  Users,
  UserRoundCheck,
} from "lucide-react";

export const metadata = {
  title: "SchoolDB | Run Your School. Simply.",
  description:
    "SchoolDB brings students, academics, attendance, examinations, fees and school operations into one connected platform.",
};

const modules = [
  {
    icon: Users,
    title: "Students & Enrolments",
    text: "Keep student records, admissions, enrolments and academic information organised in one place.",
  },
  {
    icon: Layers3,
    title: "Academic Structure",
    text: "Build your school around academic years, classes, sections and subjects.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance",
    text: "Run daily attendance workflows with a clear view of attendance activity.",
  },
  {
    icon: GraduationCap,
    title: "Examinations",
    text: "Keep examination workflows connected to your school's academic structure.",
  },
  {
    icon: IndianRupee,
    title: "Fees & Receipts",
    text: "Manage fee activity, collections and receipt workflows alongside student records.",
  },
  {
    icon: BookOpenCheck,
    title: "Homework",
    text: "Keep academic homework activity organised inside the same school workspace.",
  },
];

const benefits = [
  "One connected school workspace",
  "Structured student and academic records",
  "Clearer operational visibility",
  "Designed around real school workflows",
  "Less dependency on scattered files",
  "Built to grow with your school",
];

const stats = [
  { value: "01", label: "Connected workspace" },
  { value: "06+", label: "Core school modules" },
  { value: "100%", label: "School-focused workflow" },
];

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950">
      {/* ====================================================================
          NAVIGATION
          ==================================================================== */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/marketing" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-[0_8px_22px_rgba(79,70,229,0.22)]">
              <GraduationCap className="size-5" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[17px] font-bold tracking-tight text-slate-950">
                SchoolDB
              </div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-600">
                School Operations
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-500 md:flex">
            <a className="transition hover:text-indigo-600" href="#features">
              Features
            </a>
            <a className="transition hover:text-indigo-600" href="#workflow">
              How it works
            </a>
            <a className="transition hover:text-indigo-600" href="#why-schooldb">
              Why SchoolDB
            </a>
          </nav>

          <a
            href="#demo"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,0.18)] transition hover:bg-indigo-700 hover:shadow-[0_10px_24px_rgba(79,70,229,0.24)]"
          >
            Book a demo
            <ArrowRight className="size-4" />
          </a>
        </div>
      </header>

      {/* ====================================================================
          HERO
          ==================================================================== */}
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div className="pointer-events-none absolute -right-40 -top-48 size-[620px] rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 bottom-[-260px] size-[520px] rounded-full bg-violet-100/45 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.92fr] lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.13em] text-indigo-600">
              <Sparkles className="size-3.5" />
              Modern school operations
            </div>

            <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[68px]">
              Run your school.
              <span className="block bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
                Simply.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              One connected platform for students, academics, attendance,
              examinations, fees and everyday school administration.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(79,70,229,0.20)] transition hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                See SchoolDB in action
                <ArrowRight className="size-4" />
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-700"
              >
                Explore features
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
              {[
                "Structured workflows",
                "School-specific workspace",
                "Management visibility",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-xs font-medium text-slate-500"
                >
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Product preview — intentionally styled like the application */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-indigo-200/60 via-violet-100/40 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.6rem] border border-slate-200/90 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
              <div className="border-b border-slate-200/70 bg-gradient-to-r from-white to-indigo-50/35 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                      <BarChart3 className="size-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                        School Overview
                      </div>
                      <div className="mt-0.5 text-base font-bold text-slate-950">
                        Green Valley School
                      </div>
                    </div>
                  </div>
                  <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-100">
                    2026–27
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                {[
                  ["Students", "1,248"],
                  ["Teachers", "86"],
                  ["Classes", "42"],
                  ["Attendance", "94.6%"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_5px_18px_rgba(15,23,42,0.035)]"
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {label}
                    </div>
                    <div className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 px-5 pb-5 sm:grid-cols-[1.25fr_.75fr]">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_5px_18px_rgba(15,23,42,0.035)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Attendance trend
                    </span>
                    <CalendarCheck2 className="size-4 text-indigo-500" />
                  </div>
                  <div className="mt-5 flex h-28 items-end gap-1.5">
                    {[42, 58, 51, 72, 67, 84, 76, 92, 81, 96, 88, 94].map(
                      (height, index) => (
                        <div
                          key={index}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-400"
                          style={{ height: `${height}%` }}
                        />
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_5px_18px_rgba(15,23,42,0.035)]">
                  <div className="text-xs font-bold text-slate-700">
                    Fee collection
                  </div>
                  <div className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
                    ₹18.4L
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold text-emerald-600">
                    +12.8% this month
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-indigo-600 to-violet-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-4 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.10)] sm:block">
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Today's status
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="size-2 rounded-full bg-emerald-500" />
                Operations on track
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          STATS
          ==================================================================== */}
      <section className="px-5 py-8 sm:px-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:grid-cols-3">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`px-6 py-5 ${index > 0 ? "border-t border-slate-200/70 sm:border-l sm:border-t-0" : ""}`}
            >
              <div className="text-2xl font-bold tracking-tight text-indigo-600">
                {stat.value}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          FEATURES
          ==================================================================== */}
      <section id="features" className="px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <Sparkles className="size-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Everything connected
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                The core of your school, in one place.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">
                SchoolDB follows the structure of a real school so teams can
                work from a shared operational foundation.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_14px_35px_rgba(79,70,229,0.09)]"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 transition group-hover:bg-indigo-600 group-hover:text-white group-hover:ring-indigo-600">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-sm font-bold text-slate-900">
                  {title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          WORKFLOW
          ==================================================================== */}
      <section id="workflow" className="border-y border-slate-200/70 bg-white px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <Layers3 className="size-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                Built around your structure
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Structure first. Operations second.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Set up the school's academic foundation once, then run daily
              workflows against it.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-6">
            {[
              ["01", "Academic Year", "Define the active academic context."],
              ["02", "Classes & Sections", "Organise the school's academic structure."],
              ["03", "Students & Enrolments", "Connect students to the right academic context."],
              ["04", "Daily Operations", "Run attendance, exams, fees and homework."],
            ].map(([number, title, description], index) => (
              <div key={number} className="relative flex gap-4 py-3 first:pt-0 last:pb-0">
                {index < 3 && (
                  <div className="absolute bottom-[-6px] left-[17px] top-[46px] w-px bg-indigo-100" />
                )}
                <div className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-100">
                  {number}
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-3">
                  <div className="text-sm font-bold text-slate-900">{title}</div>
                  <div className="mt-0.5 text-xs leading-5 text-slate-500">{description}</div>
                </div>
              </div>
            ))}
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">
              <BarChart3 className="size-4" /> Management dashboard & operational visibility
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          WHY SCHOOLDB
          ==================================================================== */}
      <section id="why-schooldb" className="px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/45 to-violet-50/55 p-7 shadow-[0_12px_40px_rgba(15,23,42,0.045)] sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.20)]">
                <ShieldCheck className="size-5" />
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Less scattered information. More clarity.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                SchoolDB is designed to make everyday administration more
                organised without making the school feel like a technology
                project.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span className="text-xs font-semibold leading-5 text-slate-700">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          DEMO CTA
          ==================================================================== */}
      <section id="demo" className="px-5 pb-20 sm:px-8 lg:pb-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 px-7 py-12 shadow-[0_20px_60px_rgba(15,23,42,0.14)] sm:px-10 lg:px-14 lg:py-14">
          <div className="relative mx-auto max-w-3xl text-center">
            <div className="pointer-events-none absolute left-1/2 top-1/2 -z-0 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
            <div className="relative z-10">
              <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white/10 text-indigo-200 ring-1 ring-white/10">
                <UserRoundCheck className="size-5" />
              </div>
              <div className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">
                Ready when you are
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                See how your school could run with SchoolDB.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Book a personalised demonstration and see the platform through
                the workflows your school actually uses.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href="mailto:demo@schooldb.example"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-indigo-50"
                >
                  Request a demo
                  <ArrowRight className="size-4" />
                </a>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  School login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          FOOTER
          ==================================================================== */}
      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-semibold text-slate-600">SchoolDB</div>
          <div>Modern school operations, structured beautifully.</div>
          <Link className="font-semibold text-indigo-600 hover:text-indigo-700" href="/login">
            School login <ArrowRight className="ml-1 inline size-3.5" />
          </Link>
        </div>
      </footer>
    </main>
  );
}

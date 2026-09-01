import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  Layers3,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
  X,
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
    text: "Keep student records, admissions and enrolment information organised in one place.",
  },
  {
    icon: Layers3,
    title: "Academic Structure",
    text: "Build your school around academic years, classes, sections and subjects.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance",
    text: "Run day-to-day attendance workflows with a clear view of attendance performance.",
  },
  {
    icon: GraduationCap,
    title: "Examinations",
    text: "Keep examination workflows connected to the school's academic structure.",
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

export default function MarketingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/marketing" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-white">SchoolDB</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">School Operations</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#how-it-works" className="transition hover:text-white">How it works</a>
            <a href="#why-schooldb" className="transition hover:text-white">Why SchoolDB</a>
          </nav>

          <a href="#demo" className="hidden rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:inline-flex">
            Book a demo <ArrowRight className="ml-2 size-4" />
          </a>
        </div>
      </header>

      <section className="relative isolate min-h-[760px] overflow-hidden bg-slate-950 pt-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(99,102,241,.28),transparent_32%),radial-gradient(circle_at_80%_25%,rgba(139,92,246,.22),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#17113b_100%)]" />
        <div className="absolute -right-32 top-32 -z-10 size-[420px] rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -left-40 bottom-0 -z-10 size-[420px] rounded-full bg-violet-500/10 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:py-28">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-indigo-200 backdrop-blur">
              <Sparkles className="size-3.5" /> Built for modern school operations
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Run your school.
              <span className="block bg-gradient-to-r from-indigo-300 via-violet-300 to-white bg-clip-text text-transparent">Simply.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              One connected platform for students, academics, attendance, examinations, fees and everyday school administration.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#demo" className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950 shadow-2xl shadow-black/20 transition hover:-translate-y-0.5">
                See SchoolDB in action <ArrowRight className="ml-2 size-4" />
              </a>
              <a href="#features" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">
                Explore features
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-indigo-300" /> Structured workflows</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-indigo-300" /> School-specific workspace</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-indigo-300" /> Management visibility</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/25 to-violet-500/10 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.07] p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="overflow-hidden rounded-[1.45rem] border border-white/10 bg-slate-900">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <div className="text-xs font-medium text-slate-400">School Overview</div>
                    <div className="mt-1 text-lg font-semibold text-white">Green Valley School</div>
                  </div>
                  <div className="rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">2026–27</div>
                </div>
                <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                  {[['Students','1,248'],['Teachers','86'],['Classes','42'],['Attendance','94.6%']].map(([label,value]) => (
                    <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.045] p-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
                      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 px-5 pb-5 sm:grid-cols-[1.25fr_.75fr]">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Attendance trend</span>
                      <BarChart3 className="size-4 text-indigo-300" />
                    </div>
                    <div className="mt-5 flex h-28 items-end gap-2">
                      {[42,58,51,72,67,84,76,92,81,96,88,94].map((height, index) => (
                        <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-300" style={{height: `${height}%`}} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-4">
                    <div className="text-xs font-semibold text-slate-300">Fee collection</div>
                    <div className="mt-5 text-2xl font-semibold text-white">₹18.4L</div>
                    <div className="mt-2 text-xs text-emerald-300">+12.8% this month</div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[78%] rounded-full bg-gradient-to-r from-indigo-500 to-violet-400" /></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-7 -left-5 hidden rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur sm:block">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Today's status</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white"><span className="size-2 rounded-full bg-emerald-400" /> Operations on track</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-5 py-24 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Everything connected</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-5xl">The core of your school, in one place.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">SchoolDB follows the structure of a real school so teams can work from a shared operational foundation.</p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {modules.map(({icon: Icon, title, text}) => (
              <article key={title} className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_12px_40px_rgba(15,23,42,.045)] transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_20px_50px_rgba(79,70,229,.10)]">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white"><Icon className="size-5" /></div>
                <h3 className="mt-6 text-xl font-semibold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-50 px-5 py-24 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Built around your structure</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">Structure first. Operations second.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">Set up the school's academic foundation once, then run daily workflows against it.</p>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.07)] sm:p-8">
              {['Academic Year','Classes & Sections','Students & Enrolments','Attendance · Exams · Fees · Homework'].map((item, index) => (
                <div key={item} className="flex items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-600">0{index + 1}</div>
                  <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-800">{item}</div>
                  {index < 3 && <div className="absolute" />}
                </div>
              ))}
              <div className="mt-6 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white">↓ Management Dashboard & operational visibility</div>
            </div>
          </div>
        </div>
      </section>

      <section id="why-schooldb" className="bg-white px-5 py-24 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2.5rem] bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 sm:p-12 lg:p-16">
            <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
              <div>
                <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl"><ShieldCheck className="size-6" /></div>
                <h2 className="mt-7 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">Less scattered information. More clarity.</h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">SchoolDB is designed to make everyday administration more organised without making the school feel like a technology project.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-sm backdrop-blur">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-indigo-600" />
                    <span className="text-sm font-semibold leading-6 text-slate-800">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="relative overflow-hidden bg-slate-950 px-5 py-24 text-white sm:px-8 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,.25),transparent_45%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10"><Sparkles className="size-6 text-indigo-200" /></div>
          <h2 className="mt-7 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">See how your school could run with SchoolDB.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">Book a personalised demonstration and explore the workflows that matter to your school.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="mailto:demo@schooldb.in?subject=SchoolDB%20Demo%20Request" className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5">Request a demo <ArrowRight className="ml-2 size-4" /></a>
            <Link href="/kotak_vizag/login" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">Open SchoolDB</Link>
          </div>
          <p className="mt-6 text-xs text-slate-500">Demo contact and public URLs can be updated when the marketing domain is finalised.</p>
        </div>
      </section>

      <footer className="bg-slate-950 px-5 pb-10 pt-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-white/10 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>© 2026 SchoolDB. Built for schools. Designed for clarity.</div>
          <div className="flex gap-6"><Link href="/marketing" className="hover:text-white">SchoolDB</Link><Link href="/kotak_vizag/login" className="hover:text-white">Sign in</Link></div>
        </div>
      </footer>
    </main>
  );
}

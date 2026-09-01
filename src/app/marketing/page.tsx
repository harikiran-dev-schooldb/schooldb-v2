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
  Sparkles,
  Users,
  ShieldCheck,
} from "lucide-react";

export const metadata = {
  title: "SchoolDB | Run Your School. Simply.",
  description: "One connected platform for modern school administration.",
};

const modules = [
  [Users, "Students", "Admissions, student records and enrolments."],
  [Layers3, "Academics", "Academic years, classes, sections and subjects."],
  [ClipboardCheck, "Attendance", "Daily attendance, history and reporting."],
  [GraduationCap, "Examinations", "Keep assessment workflows connected."],
  [IndianRupee, "Fees", "Fee structures, collections and receipts."],
  [BookOpenCheck, "Homework", "Organise academic work in one workspace."],
] as const;

const workflow = [
  ["01", "Set up the school", "Create the academic year and structure your classes, sections and subjects."],
  ["02", "Bring in students", "Maintain student records and connect each enrolment to its academic context."],
  ["03", "Run daily operations", "Record attendance and manage recurring academic workflows."],
  ["04", "Understand the school", "Use reports and dashboards to see what needs attention."],
] as const;

const principles = [
  "Designed around real school structure",
  "One connected workspace for administration",
  "Clear, focused interfaces for daily work",
  "Built to support school-specific workflows",
];

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_8px_22px_rgba(79,70,229,0.20)]"><GraduationCap className="size-5" strokeWidth={2.2} /></div>
            <div><div className="text-[17px] font-bold tracking-tight">SchoolDB</div><div className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-600">School Operations</div></div>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-500 md:flex"><a href="#features" className="hover:text-indigo-600">Features</a><a href="#workflow" className="hover:text-indigo-600">How it works</a><a href="#why" className="hover:text-indigo-600">Why SchoolDB</a></nav>
          <div className="flex items-center gap-2"><Link href="/login" className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600">Login</Link><a href="#demo" className="hidden items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,0.18)] hover:bg-indigo-700 sm:inline-flex">Book a demo <ArrowRight className="size-4" /></a></div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div className="pointer-events-none absolute right-[-12%] top-[-30%] size-[620px] rounded-full bg-indigo-100/70 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-35%] left-[-10%] size-[520px] rounded-full bg-violet-100/50 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.94fr_1.06fr] lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600"><Sparkles className="size-3.5" /> Built for schools</div>
            <h1 className="max-w-2xl text-5xl font-bold leading-[1.03] tracking-[-0.045em] sm:text-6xl lg:text-[64px]">Everything your school needs.<span className="block bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">One clear workspace.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">SchoolDB connects student records, academic structure, attendance, examinations, fees and homework into one focused school operations platform.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="#demo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(79,70,229,0.20)] hover:bg-indigo-700">Request a demo <ArrowRight className="size-4" /></a><a href="#features" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-700">Explore SchoolDB</a></div>
            <div className="mt-8 grid gap-2 sm:grid-cols-2">{principles.map((item) => <div key={item} className="flex items-center gap-2 text-xs font-medium text-slate-500"><CheckCircle2 className="size-4 shrink-0 text-emerald-500" />{item}</div>)}</div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="px-5 py-8 sm:px-8"><div className="mx-auto grid max-w-7xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:grid-cols-3">{[["01", "School workspace"], ["06+", "Core operational areas"], ["01", "Connected school structure"]].map(([value, label], i) => <div key={label} className={`px-6 py-5 ${i ? "border-t border-slate-200/70 sm:border-l sm:border-t-0" : ""}`}><div className="text-2xl font-bold tracking-tight text-indigo-600">{value}</div><div className="mt-1 text-xs font-medium text-slate-500">{label}</div></div>)}</div></section>

      <section id="features" className="px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto max-w-7xl"><SectionHeading icon={<Sparkles className="size-4" />} eyebrow="Core modules" title="The school, organised around the way it actually works." text="Each area fits into the same academic and student structure, so information stays connected as your team moves through the day." /><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{modules.map(([Icon, title, text]) => <article key={title} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_14px_35px_rgba(79,70,229,0.09)]"><div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:ring-indigo-600"><Icon className="size-5" /></div><h3 className="mt-5 text-sm font-bold text-slate-900">{title}</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">{text}</p></article>)}</div></div></section>

      <section id="workflow" className="border-y border-slate-200/70 bg-white px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-center"><SectionHeading icon={<Layers3 className="size-4" />} eyebrow="School workflow" title="Set it up once. Run it every day." text="SchoolDB starts with your academic structure and gives daily operations a consistent foundation." /><div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-6">{workflow.map(([number, title, text], i) => <div key={number} className="relative flex gap-4 py-3 first:pt-0 last:pb-0">{i < workflow.length - 1 && <div className="absolute bottom-[-7px] left-[17px] top-[45px] w-px bg-indigo-100" />}<div className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-100">{number}</div><div className="flex-1 rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-3"><div className="text-sm font-bold text-slate-900">{title}</div><p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p></div></div>)}</div></div></section>

      <section id="why" className="px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto max-w-7xl rounded-[1.75rem] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/60 p-7 shadow-[0_12px_40px_rgba(15,23,42,0.045)] sm:p-10 lg:p-14"><div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center"><div><div className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.20)]"><ShieldCheck className="size-5" /></div><h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">A better operational foundation for your school.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">Make school administration more structured, visible and manageable without adding unnecessary complexity.</p></div><div className="grid gap-3 sm:grid-cols-2">{principles.map((item) => <div key={item} className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/85 p-4 shadow-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" /><span className="text-xs font-semibold leading-5 text-slate-700">{item}</span></div>)}</div></div></div></section>

      <section id="demo" className="px-5 pb-20 sm:px-8 lg:pb-24"><div className="mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] bg-slate-950 px-7 py-12 shadow-[0_20px_60px_rgba(15,23,42,0.14)] sm:px-10 lg:px-14 lg:py-14"><div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white/10 text-indigo-200 ring-1 ring-white/10"><Users className="size-5" /></div><div className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">See the product</div><h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Show your school a simpler way to work.</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Book a personalised SchoolDB demonstration and walk through the workflows your school uses every day.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><a href="mailto:demo@schooldb.example" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-indigo-50">Request a demo <ArrowRight className="size-4" /></a><Link href="/login" className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10">School login</Link></div></div></div></section>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><div className="font-semibold text-slate-600">SchoolDB</div><div>Modern school operations, structured beautifully.</div><Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">School login <ArrowRight className="ml-1 inline size-3.5" /></Link></div></footer>
    </main>
  );
}

function SectionHeading({ icon, eyebrow, title, text }: { icon: React.ReactNode; eyebrow: string; title: string; text: string }) {
  return <div className="max-w-2xl"><div className="mb-3 flex items-center gap-2"><div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">{icon}</div><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">{eyebrow}</span></div><h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h2><p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">{text}</p></div>;
}

function ProductPreview() {
  const cards = [[Users, "Students", "1,248"], [GraduationCap, "Classes", "42"], [CalendarCheck2, "Attendance", "94.6%"], [IndianRupee, "Fees", "78%"]] as const;
  return <div className="relative mx-auto w-full max-w-xl"><div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-indigo-200/60 via-violet-100/40 to-transparent blur-2xl" /><div className="relative overflow-hidden rounded-[1.6rem] border border-slate-200/90 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.13)]"><div className="border-b border-slate-200/70 bg-gradient-to-r from-white to-indigo-50/40 px-5 py-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"><BarChart3 className="size-5" /></div><div><div className="text-[9px] font-bold uppercase tracking-[0.17em] text-indigo-600">School dashboard</div><div className="mt-0.5 text-base font-bold">SchoolDB overview</div></div></div><span className="rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600">2026–27</span></div></div><div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">{cards.map(([Icon, label, value]) => <div key={label} className="rounded-xl border border-slate-200/80 p-3 shadow-[0_5px_18px_rgba(15,23,42,0.035)]"><div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</span><Icon className="size-3.5 text-indigo-500" /></div><div className="mt-2 text-xl font-bold tracking-tight">{value}</div></div>)}</div><div className="grid gap-3 px-5 pb-5 sm:grid-cols-[1.25fr_.75fr]"><div className="rounded-xl border border-slate-200/80 p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-700">Attendance overview</span><CalendarCheck2 className="size-4 text-indigo-500" /></div><div className="mt-5 flex h-28 items-end gap-1.5">{[38,54,48,66,61,78,71,87,76,94,83,91].map((height, i) => <div key={i} className="flex-1 rounded-t-md bg-indigo-600" style={{ height: `${height}%` }} />)}</div></div><div className="rounded-xl border border-slate-200/80 p-4"><div className="flex items-center gap-2 text-xs font-bold text-slate-700"><IndianRupee className="size-4 text-indigo-500" /> Fee collection</div><div className="mt-5 text-2xl font-bold">₹18.4L</div><div className="mt-1 text-[11px] font-semibold text-emerald-600">Collection progress</div><div className="mt-5 h-2 rounded-full bg-slate-100"><div className="h-full w-[78%] rounded-full bg-indigo-600" /></div></div></div></div></div>;
}

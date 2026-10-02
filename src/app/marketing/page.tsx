import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpenCheck,
  Building2,
  Bus,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Headphones,
  IndianRupee,
  Layers3,
  Library,
  LockKeyhole,
  MessageSquareText,
  MonitorSmartphone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRoundCheck,
  Users,
} from "lucide-react";

import { publicBusiness } from "@/lib/public-business";

export const metadata: Metadata = {
  title: "SchoolDB | One Platform for School Operations",
  description:
    "SchoolDB connects admissions, students, academics, attendance, examinations, fees, communication and reporting in one school operations platform.",
  openGraph: {
    title: "SchoolDB | One Platform for School Operations",
    description:
      "A clear, connected workspace for school leaders, administrators, teachers, families and students.",
    type: "website",
  },
};

const capabilities = [
  [
    UserRoundCheck,
    "Admissions & students",
    "Move from application to a structured student record and active enrolment.",
  ],
  [
    Layers3,
    "Academic structure",
    "Organise academic years, branches, classes, sections, subjects and teacher allocations.",
  ],
  [
    CalendarCheck2,
    "Attendance",
    "Run daily attendance, corrections, history, rankings and student-level reports.",
  ],
  [
    GraduationCap,
    "Examinations",
    "Plan exams and schedules, record marks and publish result and report-card views.",
  ],
  [
    IndianRupee,
    "Fees & receipts",
    "Manage fee plans, instalments, collections, outstanding balances and receipts in INR.",
  ],
  [
    BookOpenCheck,
    "Homework & learning",
    "Keep homework, subjects and teacher-led academic work connected.",
  ],
  [
    MessageSquareText,
    "Queries & communication",
    "Handle staff tickets, parent queries, notices and notifications in context.",
  ],
  [
    FileText,
    "Reports & documents",
    "Generate operational reports, receipts, certificates, ID cards and exports.",
  ],
  [
    Library,
    "Library",
    "Track books, copies, categories and lending activity alongside student records.",
  ],
  [
    Bus,
    "Transport",
    "Maintain routes, stops, vehicles and student transport assignments.",
  ],
  [
    UploadCloud,
    "Bulk operations",
    "Use guided CSV workflows for larger setup and day-to-day data operations.",
  ],
  [
    BarChart3,
    "Operational insight",
    "See attendance, collections, action items and activity from a focused dashboard.",
  ],
] as const;

const audiences = [
  [
    Building2,
    "Leadership",
    "See what needs attention",
    "A command-center view of attendance, collections, school activity and pending work.",
  ],
  [
    ClipboardCheck,
    "Administration",
    "Keep records connected",
    "Admissions, students, fees, documents and daily operations share one school structure.",
  ],
  [
    GraduationCap,
    "Teachers",
    "Move quickly through the day",
    "Access assigned classes, attendance, homework, notices and results in a focused workspace.",
  ],
  [
    Users,
    "Families & students",
    "Stay informed",
    "Use secure self-service views for attendance, fees, results, homework, notices and requests.",
  ],
] as const;

const onboardingSteps = [
  [
    "01",
    "Understand your school",
    "We begin with your academic structure, current records and the workflows your team already follows.",
  ],
  [
    "02",
    "Configure your workspace",
    "Set up the school, academic year, classes, sections, users, permissions and required modules.",
  ],
  [
    "03",
    "Bring in your data",
    "Use guided forms and bulk import tools to establish students, staff and operational records.",
  ],
  [
    "04",
    "Launch with support",
    "Walk your team through daily tasks and continue with a clear support path after go-live.",
  ],
] as const;

const assurances = [
  [
    ShieldCheck,
    "Role-based access",
    "Workspaces and actions are shaped around each user’s school and role.",
  ],
  [
    LockKeyhole,
    "Private school records",
    "Sensitive files and records are served through authenticated permission checks.",
  ],
  [
    BellRing,
    "Actionable communication",
    "Notifications, notices and support workflows keep important work visible.",
  ],
  [
    Headphones,
    "Human onboarding",
    "Your quotation, setup scope and rollout plan are agreed before launch.",
  ],
] as const;

const studentMobileScreens = [
  {
    src: "/product-screenshots/student-overview.png",
    alt: "SchoolDB Android student dashboard showing profile, attendance, homework, results and fees",
    eyebrow: "A clear daily view",
    title: "Student overview",
    text: "One place for the learner’s profile and the school information families check most often.",
  },
  {
    src: "/product-screenshots/student-attendance.png",
    alt: "SchoolDB Android attendance history with present and absent records",
    eyebrow: "Easy to understand",
    title: "Attendance history",
    text: "Families can see the overall position and the status of each recorded school day.",
  },
  {
    src: "/product-screenshots/student-homework.png",
    alt: "SchoolDB Android homework screen showing an assignment and due date",
    eyebrow: "Work stays visible",
    title: "Homework and deadlines",
    text: "Assignments, descriptions and due dates are presented in a focused student workspace.",
  },
] as const;

const faqs = [
  [
    "Can SchoolDB fit our existing academic structure?",
    "Yes. A demonstration starts with your school’s academic year, classes, sections, subjects and operating process so the proposed setup is grounded in how your school works.",
  ],
  [
    "Do teachers, parents and students use the same screen?",
    "No. SchoolDB uses role-aware workspaces. Administrators, teachers, families and students see the areas and actions relevant to their access.",
  ],
  [
    "Can we move existing records into SchoolDB?",
    "SchoolDB includes guided bulk operations for common school data. The onboarding scope identifies what can be imported and what preparation is required.",
  ],
  [
    "How is pricing decided?",
    "Pricing is provided in a written INR quotation based on student count, selected modules, onboarding needs and subscription term. Scope, taxes and payment schedule are shown before payment.",
  ],
  [
    "How does SchoolDB protect school data?",
    "SchoolDB combines authenticated accounts, active school membership, role and permission checks, school-scoped records, private file delivery and operational audit records.",
  ],
  [
    "Can families use SchoolDB on Android?",
    "Yes. The Android experience gives students and families focused access to information such as attendance, homework, fees, results and school notices.",
  ],
] as const;

const demoMailto = `mailto:${publicBusiness.email}?subject=SchoolDB%20demo%20request`;
const quoteMailto = `mailto:${publicBusiness.email}?subject=SchoolDB%20subscription%20quotation`;

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-500 lg:flex">
            <a href="#platform" className="transition hover:text-indigo-600">
              Platform
            </a>
            <a href="#roles" className="transition hover:text-indigo-600">
              For your team
            </a>
            <a href="#mobile" className="transition hover:text-indigo-600">
              Mobile app
            </a>
            <a href="#onboarding" className="transition hover:text-indigo-600">
              Onboarding
            </a>
            <Link href="/security" className="transition hover:text-indigo-600">
              Security
            </Link>
            <a href="#pricing" className="transition hover:text-indigo-600">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600"
            >
              Login
            </Link>
            <a
              href={demoMailto}
              className="hidden items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(79,70,229,0.18)] transition hover:bg-indigo-700 sm:inline-flex"
            >
              Book a demo <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div className="pointer-events-none absolute -right-32 -top-48 size-[680px] rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-52 left-[-8%] size-[620px] rounded-full bg-violet-100/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700">
              <Sparkles className="size-3.5" /> Built around the school day
            </div>
            <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[1.02] tracking-[-0.052em] sm:text-6xl lg:text-[68px]">
              Your school,
              <span className="block bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
                working as one.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              SchoolDB gives leaders, administrators, teachers and families one
              connected platform for the work that keeps a school moving.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={demoMailto}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(79,70,229,0.22)] transition hover:bg-indigo-700"
              >
                Request a school demo <ArrowRight className="size-4" />
              </a>
              <a
                href="#platform"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-700"
              >
                Explore the platform
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-slate-500">
              {[
                "Web and Android",
                "Role-aware workspaces",
                "INR billing workflows",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="px-5 py-7 sm:px-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] md:grid-cols-3">
          {[
            ["One system", "From admission to everyday operations"],
            ["Every role", "Leadership, staff, teachers and families"],
            ["Your identity", "School-specific branding and workspace"],
          ].map(([title, text], index) => (
            <div
              key={title}
              className={`px-6 py-5 ${index ? "border-t border-slate-200/70 md:border-l md:border-t-0" : ""}`}
            >
              <p className="text-sm font-black tracking-tight text-indigo-600">
                {title}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="platform"
        className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            icon={<Layers3 className="size-4" />}
            eyebrow="Connected school operations"
            title="One school structure. Every essential workflow."
            text="SchoolDB keeps people, academic context and operational records connected, so your team does not have to rebuild the same information across separate tools."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(([Icon, title, text]) => (
              <article
                key={title}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_16px_38px_rgba(79,70,229,0.09)]"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 transition group-hover:bg-indigo-600 group-hover:text-white group-hover:ring-indigo-600">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-base font-bold text-slate-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="roles"
        className="scroll-mt-24 border-y border-slate-200/70 bg-white px-5 py-20 sm:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            icon={<Users className="size-4" />}
            eyebrow="One school, focused experiences"
            title="The right workspace for each person."
            text="People work from the same school data while seeing the information and actions appropriate to their role."
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {audiences.map(([Icon, label, title, text], index) => (
              <article
                key={label}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5"
              >
                <span className="absolute right-4 top-4 text-5xl font-black tracking-[-0.08em] text-indigo-100/80">
                  0{index + 1}
                </span>
                <div className="relative flex size-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/80">
                  <Icon className="size-5" />
                </div>
                <p className="relative mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                  {label}
                </p>
                <h3 className="relative mt-2 text-lg font-bold tracking-tight">
                  {title}
                </h3>
                <p className="relative mt-2 text-sm leading-6 text-slate-500">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="mobile"
        className="scroll-mt-24 overflow-hidden px-5 py-20 sm:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
            <SectionHeading
              icon={<MonitorSmartphone className="size-4" />}
              eyebrow="A real look at SchoolDB Mobile"
              title="The school day in every family’s reach."
              text="SchoolDB gives students and families a calm, focused Android experience for the information they need—without exposing the complexity of the administrative workspace."
            />
            <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/65 to-violet-50/70 p-5 shadow-[0_18px_50px_rgba(79,70,229,0.08)] sm:p-6">
              <div className="flex items-center gap-3">
                <Image
                  src="/schooldb-app-logo.png"
                  alt="SchoolDB app"
                  width={52}
                  height={52}
                  className="size-13 rounded-2xl object-cover shadow-[0_10px_24px_rgba(30,64,175,0.22)]"
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                    SchoolDB for Android
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    Built for students, families and school teams
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {[
                  "Live student information",
                  "Attendance by school day",
                  "Homework and due dates",
                  "Fees, results and notices",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/80 px-3.5 py-3 text-xs font-semibold text-slate-700 shadow-sm"
                  >
                    <Check className="size-4 shrink-0 text-indigo-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
            {studentMobileScreens.map((screen) => (
              <article
                key={screen.title}
                className="min-w-[82vw] snap-center overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-3 shadow-[0_18px_55px_rgba(15,23,42,0.09)] sm:min-w-[390px] lg:min-w-0"
              >
                <div className="overflow-hidden rounded-[1.35rem] bg-gradient-to-b from-indigo-50/80 to-slate-50">
                  <Image
                    src={screen.src}
                    alt={screen.alt}
                    width={1187}
                    height={2513}
                    sizes="(max-width: 640px) 82vw, (max-width: 1024px) 390px, 30vw"
                    className="h-auto w-full"
                  />
                </div>
                <div className="px-3 pb-4 pt-5 sm:px-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                    {screen.eyebrow}
                  </p>
                  <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
                    {screen.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {screen.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-slate-400 lg:hidden">
            Swipe to explore the SchoolDB mobile experience
          </p>
        </div>
      </section>

      <section
        id="onboarding"
        className="scroll-mt-24 border-y border-slate-200/70 bg-white px-5 py-20 sm:px-8 lg:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
          <SectionHeading
            icon={<Activity className="size-4" />}
            eyebrow="A practical path to launch"
            title="Start with your school, not a generic template."
            text="A useful rollout begins by understanding your people, structure and existing process, then configuring SchoolDB around the agreed scope."
          />
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/55 p-5 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-6">
            {onboardingSteps.map(([number, title, text], index) => (
              <div
                key={number}
                className="relative flex gap-4 py-3 first:pt-0 last:pb-0"
              >
                {index < onboardingSteps.length - 1 && (
                  <div className="absolute bottom-[-8px] left-[18px] top-[47px] w-px bg-indigo-100" />
                )}
                <div className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-[10px] font-black text-white shadow-sm">
                  {number}
                </div>
                <div className="flex-1 rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="trust"
        className="scroll-mt-24 px-5 py-16 sm:px-8 lg:py-20"
      >
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[1.8rem] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/55 to-violet-50/70 px-6 py-10 shadow-[0_18px_55px_rgba(79,70,229,0.09)] sm:px-10 lg:px-14 lg:py-14">
          <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-indigo-200/35 blur-3xl" />
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div className="relative">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                <ShieldCheck className="size-5" />
              </div>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                Confidence by design
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
                A school workspace with clear boundaries.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
                SchoolDB combines role-aware access, school-specific context and
                operational visibility with a direct onboarding relationship.
              </p>
            </div>
            <div className="relative grid gap-3 sm:grid-cols-2">
              {assurances.map(([Icon, title, text]) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.045)]"
                >
                  <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="scroll-mt-24 border-y border-slate-200/70 bg-white px-5 py-20 sm:px-8 lg:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <SectionHeading
            icon={<ReceiptText className="size-4" />}
            eyebrow="Clear subscription scope"
            title="A written INR quotation for your school."
            text="Choose the operational areas and onboarding support your school needs. The exact scope is documented before subscription payment."
          />
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60 p-6 shadow-[0_12px_38px_rgba(79,70,229,0.08)] sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
              Custom annual subscription
            </p>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              Pay for the scope your school agrees to.
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your quotation considers student count, selected modules,
              onboarding needs and subscription term. It clearly lists included
              services, taxes and the payment schedule.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={quoteMailto}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                Request a quotation <ArrowRight className="size-4" />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
              >
                Contact SchoolDB
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            icon={<MessageSquareText className="size-4" />}
            eyebrow="Questions schools ask"
            title="Know what the next step looks like."
            text="A personalised demonstration is the best place to confirm fit, scope and rollout expectations for your school."
          />
          <div className="mt-10 space-y-3">
            {faqs.map(([question, answer]) => (
              <details
                key={question}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] open:border-indigo-200"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-slate-900 marker:content-none">
                  {question}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-lg font-medium text-indigo-600 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">
                  {answer}
                </p>
              </details>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/faq"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              View all FAQs <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/security"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              Data security & trust
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:pb-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[1.8rem] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50/80 px-7 py-12 shadow-[0_18px_55px_rgba(79,70,229,0.10)] sm:px-10 lg:px-14 lg:py-14">
          <div className="pointer-events-none absolute -bottom-28 -right-20 size-72 rounded-full bg-violet-200/35 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-indigo-600">
                See SchoolDB with your workflow
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
                Give your team one clearer way to run the school day.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Tell us how your school works today. We will show the relevant
                SchoolDB workflows and discuss a practical path to launch.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a
                href={demoMailto}
                className="inline-flex min-w-48 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-black text-white shadow-[0_10px_25px_rgba(79,70,229,0.22)] transition hover:bg-indigo-700"
              >
                Book a demo <ArrowRight className="size-4" />
              </a>
              <a
                href={`tel:${publicBusiness.phoneHref}`}
                className="inline-flex min-w-48 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-700"
              >
                Call {publicBusiness.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3"
      aria-label="SchoolDB home"
    >
      <Image
        src="/schooldb-app-logo.png"
        alt=""
        width={42}
        height={42}
        priority
        className="size-10 rounded-xl object-cover shadow-[0_8px_22px_rgba(30,64,175,0.20)]"
      />
      <span>
        <span className="block text-[17px] font-black tracking-tight">
          SchoolDB
        </span>
        <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-600">
          School Operations
        </span>
      </span>
    </Link>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
  text,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
          {eyebrow}
        </span>
      </div>
      <h2 className="text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-500">{text}</p>
    </div>
  );
}

function ProductPreview() {
  const metrics = [
    [Users, "Students", "1,248", "Active records"],
    [CalendarCheck2, "Attendance", "94.6%", "Today"],
    [IndianRupee, "Collections", "₹18.4L", "This month"],
  ] as const;

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -inset-7 rounded-[2rem] bg-gradient-to-br from-indigo-200/60 via-violet-100/50 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.65rem] border border-slate-200/90 bg-[#f8f9fd] shadow-[0_30px_90px_rgba(15,23,42,0.15)]">
        <div className="flex items-center justify-between border-b border-slate-200/70 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
              <Activity className="size-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-indigo-600">
                School operations
              </p>
              <p className="mt-0.5 text-sm font-bold">School Command Center</p>
            </div>
          </div>
          <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
            2026–27
          </span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/60 p-4 shadow-[0_12px_32px_rgba(79,70,229,0.07)] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-indigo-600">
                  Today at your school
                </p>
                <h2 className="mt-1.5 text-lg font-bold tracking-tight sm:text-xl">
                  A live view of the school day
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Attendance, students, staff and collections in one place.
                </p>
              </div>
              <Sparkles className="size-5 shrink-0 text-violet-500" />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {metrics.map(([Icon, label, value, detail]) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-white/90 p-3 shadow-sm"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-black text-slate-900">
                      {value}
                    </p>
                    <p className="truncate text-[8px] text-slate-400">
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1.25fr_.75fr]">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                    Attendance today
                  </p>
                  <p className="mt-1 text-sm font-bold">Daily position</p>
                </div>
                <CalendarCheck2 className="size-4 text-indigo-500" />
              </div>
              <div className="mt-5 flex h-24 items-end gap-1.5">
                {[42, 58, 50, 72, 66, 82, 76, 91, 80, 95, 86, 93].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t bg-gradient-to-t from-indigo-600 to-violet-500"
                      style={{ height: `${height}%` }}
                    />
                  ),
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-600">
                Needs attention
              </p>
              <div className="mt-3 space-y-2">
                {["Attendance review", "Fee follow-up", "Parent query"].map(
                  (item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2"
                    >
                      <span
                        className={`size-2 rounded-full ${index === 0 ? "bg-amber-400" : "bg-indigo-400"}`}
                      />
                      <span className="text-[10px] font-semibold text-slate-600">
                        {item}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-5 py-10 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-4 max-w-md text-xs leading-5 text-slate-500">
            A connected school operations platform provided by{" "}
            {publicBusiness.legalName}.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Udyam: {publicBusiness.udyamNumber}
          </p>
        </div>
        <nav
          aria-label="Company and policy links"
          className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs font-semibold text-slate-600"
        >
          {[
            ["About", "/about"],
            ["FAQ", "/faq"],
            ["Data security", "/security"],
            ["Contact", "/contact"],
            ["Privacy", "/privacy-policy"],
            ["Terms", "/terms"],
            ["Refunds", "/refund-policy"],
            ["Account deletion", "/account-deletion"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="transition hover:text-indigo-600"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="text-xs leading-5 text-slate-500">
          <p className="font-bold text-slate-700">Talk to SchoolDB</p>
          <a
            href={`mailto:${publicBusiness.email}`}
            className="mt-2 block hover:text-indigo-600"
          >
            {publicBusiness.email}
          </a>
          <a
            href={`tel:${publicBusiness.phoneHref}`}
            className="mt-1 block hover:text-indigo-600"
          >
            {publicBusiness.phone}
          </a>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center gap-1 font-bold text-indigo-600"
          >
            School login <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}

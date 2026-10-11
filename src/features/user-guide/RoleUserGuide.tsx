"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BookOpenCheck,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  CloudOff,
  ExternalLink,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const guideRoles = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "RECEPTIONIST",
  "PARENT",
  "STUDENT",
] as const;

type GuideRole = (typeof guideRoles)[number];

type GuideSection = {
  title: string;
  description: string;
  steps: string[];
};

type Guide = {
  label: string;
  shortLabel: string;
  summary: string;
  start: string[];
  sections: GuideSection[];
  checks: string[];
};

type QuickLink = {
  label: string;
  description: string;
  href: string;
};

type GuideScreenshot = {
  src: string;
  title: string;
  description: string;
};

const guides: Record<GuideRole, Guide> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    shortLabel: "Super Admin",
    summary: "Create school workspaces, govern route access, protect administrator access, and oversee every school module.",
    start: [
      "Review the school name in the header before changing data.",
      "Check Activity & Audit Logs and System Health for exceptions.",
      "Open Schools when onboarding or changing a school workspace.",
    ],
    sections: [
      {
        title: "Onboard a school",
        description: "Create the workspace and its academic foundation in the right order.",
        steps: [
          "Open Schools, choose Add School, and confirm the generated school URL.",
          "Upload the approved school logo and configure Route Access.",
          "Complete Academic Year, branches, classes, sections, subjects, periods, teachers, and allocations.",
          "Create the Principal or School Admin account and test the new workspace.",
        ],
      },
      {
        title: "Control access",
        description: "Keep privileges appropriate for each person's work.",
        steps: [
          "Create administrator and operational logins from User Accounts.",
          "Create teachers from Teachers so their login remains linked to allocations.",
          "Assign View, Manage, or No access by module for non-admin staff.",
          "Deactivate access promptly when a staff member leaves.",
        ],
      },
      {
        title: "Govern the platform",
        description: "Use evidence from the system before making broad changes.",
        steps: [
          "Review audit activity, route access, reports, and management analytics.",
          "Confirm production migrations, payment webhooks, backups, and notification delivery with the technical operator.",
          "Export only approved data and keep each school's records separate.",
        ],
      },
    ],
    checks: ["Correct school selected", "Admin access reviewed", "Audit exceptions handled", "System health reviewed"],
  },
  SCHOOL_ADMIN: {
    label: "Principal / School Admin",
    shortLabel: "Principal",
    summary: "Run the school day, maintain academic structure, delegate staff access, and monitor academic, financial, and operational performance.",
    start: [
      "Review Dashboard, attendance completion, fees, leave, and open queries.",
      "Check notifications and operational issues requiring a decision.",
      "Use Reports for detail and Management Analytics for trends.",
    ],
    sections: [
      {
        title: "Set up academics",
        description: "Configuration must exist before daily modules can work reliably.",
        steps: [
          "Maintain academic years, branches, classes, sections, subjects, and class subjects.",
          "Create teachers, teacher allocations, and class teachers.",
          "Configure school periods, then build and review the timetable.",
          "Enroll active students in the correct academic year, class, and section.",
        ],
      },
      {
        title: "Manage people and access",
        description: "Use roles for job type and custom permissions for exceptions.",
        steps: [
          "Create Accountants and Receptionists from User Accounts; create Teachers from Teachers.",
          "Give non-admin staff only the modules and access level they need.",
          "Inactivate students or staff when history must remain available.",
          "Ask the Super Admin for administrator-level account changes.",
        ],
      },
      {
        title: "Review operations",
        description: "Monitor exceptions across the school, not just totals.",
        steps: [
          "Review incomplete attendance, low attendance, exams, marks, and homework.",
          "Reconcile fees, payment verification, expenses, payroll, and outstanding balances.",
          "Review visitors, health, pickup, maintenance, library, transport, leave, and parent queries.",
        ],
      },
    ],
    checks: ["Attendance complete", "Payments reconciled", "Queries assigned", "Staff access current"],
  },
  TEACHER: {
    label: "Teacher",
    shortLabel: "Teacher",
    summary: "Work with assigned classes, mark attendance, publish homework, enter marks, and follow the teaching timetable.",
    start: [
      "Open My Dashboard and review today's classes.",
      "Mark attendance for the correct date, class, and section.",
      "Review homework, timetable, notifications, queries, and leave requests.",
    ],
    sections: [
      {
        title: "Mark attendance",
        description: "Complete one accurate attendance session for each class.",
        steps: [
          "Open Attendance and verify date, class, and section.",
          "Mark every student and compare present/absent totals before saving.",
          "Use class or student reports when enabled.",
          "Request an authorized correction when a locked session is wrong.",
        ],
      },
      {
        title: "Homework and timetable",
        description: "Publish clear work to the correct audience.",
        steps: [
          "Choose the allocated class, section, and subject.",
          "Add a clear title, instructions, and realistic due date.",
          "Review Daily View or Teacher View before the school day.",
          "Report a missing allocation instead of using another class as a workaround.",
        ],
      },
      {
        title: "Exams and marks",
        description: "Enter results against the correct exam schedule.",
        steps: [
          "Choose the exam, schedule, class, section, and subject carefully.",
          "Check maximum marks and absent status for every student.",
          "Review totals before saving and verify the published result afterward.",
        ],
      },
    ],
    checks: ["All classes marked", "Homework audience checked", "Marks verified", "Pending offline work synced"],
  },
  ACCOUNTANT: {
    label: "Accountant",
    shortLabel: "Accountant",
    summary: "Collect and reconcile fees, issue receipts, verify payments, record expenses, process payroll, and control inventory.",
    start: [
      "Review fee collections, outstanding balances, and verification queues.",
      "Check the student and installment before recording any payment.",
      "Reconcile cash, bank/UPI, and online totals before closing the day.",
    ],
    sections: [
      {
        title: "Collect fees",
        description: "Create one accurate ledger entry and receipt.",
        steps: [
          "Find the student by admission number and verify class and section.",
          "Review assigned installments, earlier payments, and outstanding balance.",
          "Confirm amount, method, date, and reference before saving.",
          "Issue the receipt and confirm the entry in Payment History.",
        ],
      },
      {
        title: "Verify payments",
        description: "Avoid duplicate collection when a response is delayed.",
        steps: [
          "Check Payment History, Receipts, and UPI Verification before retrying.",
          "Match payer reference, amount, student, and provider status.",
          "Never mark a payment successful without the evidence required by school policy.",
        ],
      },
      {
        title: "Close the period",
        description: "Make financial exceptions visible and traceable.",
        steps: [
          "Reconcile collections by payment method and review duplicates or pending entries.",
          "Verify expenses, payroll, payslips, and inventory adjustments.",
          "Preserve historical payments when a student becomes inactive.",
        ],
      },
    ],
    checks: ["Collections reconciled", "UPI queue reviewed", "Receipts confirmed", "Differences escalated"],
  },
  RECEPTIONIST: {
    label: "Receptionist",
    shortLabel: "Receptionist",
    summary: "Operate admissions and the front desk, maintain permitted student details, and manage visitors, pickup, health, IDs, and maintenance requests.",
    start: [
      "Review new admissions, expected visitors, pickups, and open front-office issues.",
      "Search for an existing student before creating or converting a record.",
      "Keep visitor, health, identity, and contact information confidential.",
    ],
    sections: [
      {
        title: "Admissions and students",
        description: "Prevent duplicates and preserve a clean student record.",
        steps: [
          "Verify applicant, guardian contact, requested class, and documents.",
          "Search by admission number and guardian phone before converting an application.",
          "Confirm the resulting student record, then prepare an approved ID card if required.",
        ],
      },
      {
        title: "Visitors and pickup",
        description: "Record the visit while following the school's physical security process.",
        steps: [
          "Record visitor identity, contact, purpose, host, and check-in.",
          "Record check-out when the visitor leaves.",
          "For pickup, verify the authorized person's identity before recording release.",
          "Escalate any identity or authorization mismatch immediately.",
        ],
      },
      {
        title: "Front-office follow-up",
        description: "Make every unresolved issue visible to the next shift.",
        steps: [
          "Record authorized health information with appropriate confidentiality.",
          "Create maintenance tickets with location, issue, and priority.",
          "Review queries and hand over unresolved visitors, pickups, admissions, or tickets.",
        ],
      },
    ],
    checks: ["Visitors checked out", "Pickup verified", "Admissions synchronized", "Open issues handed over"],
  },
  PARENT: {
    label: "Parent",
    shortLabel: "Parent",
    summary: "Follow each linked child's attendance, homework, fees, exams, results, timetable, transport, library, documents, and school updates.",
    start: [
      "Choose a child when more than one student is linked.",
      "Review attendance, active homework, fee balance, next exam, and notifications.",
      "Use Switch student to move between children without signing in again.",
    ],
    sections: [
      {
        title: "Follow learning",
        description: "Use Student Space as the current view of school information.",
        steps: [
          "Open Homework for assignments and due dates.",
          "Review Timetable and Exams for schedule changes.",
          "Open Results and Report card after the school publishes them.",
          "Report a suspected attendance or result error to the school.",
        ],
      },
      {
        title: "Fees and leave",
        description: "Complete parent actions once and verify the result.",
        steps: [
          "Review the installment and outstanding amount before paying.",
          "Complete the hosted payment once and verify its status or receipt in SchoolDB.",
          "If payment is unclear, do not pay again; contact the Accountant with the reference.",
          "Submit and track leave or permission requests from the Leave page.",
        ],
      },
      {
        title: "Student services",
        description: "Keep operational information available when it matters.",
        steps: [
          "Review transport, library, calendar, notifications, and secure documents.",
          "Use Switch student for another linked child.",
          "Ask the school to correct official data; the parent account cannot edit it directly.",
        ],
      },
    ],
    checks: ["Correct child selected", "Updates reviewed", "Payment status verified", "Requests tracked"],
  },
  STUDENT: {
    label: "Student",
    shortLabel: "Student",
    summary: "Use your personal Student Space to keep up with classes, homework, attendance, exams, results, and school services.",
    start: [
      "Check notifications and today's timetable.",
      "Review active homework and upcoming due dates.",
      "Check exam updates and attendance regularly.",
    ],
    sections: [
      {
        title: "Plan the school day",
        description: "Keep schedule and assignments in one place.",
        steps: [
          "Open Timetable before classes begin.",
          "Open Homework and note the subject, instructions, and due date.",
          "Review Calendar and Notifications for school changes.",
        ],
      },
      {
        title: "Review progress",
        description: "Use published records and ask when something looks wrong.",
        steps: [
          "Check Attendance and report a suspected error through the school.",
          "Review Exams, Results, and Report card after publication.",
          "Do not use another student's login or share private results and documents.",
        ],
      },
      {
        title: "Use school services",
        description: "Find personal service information without visiting multiple offices.",
        steps: [
          "Review Fees, Transport, Library, Leave, and Documents as needed.",
          "Use Settings to review the account and submit a profile image for approval.",
          "Contact the school to correct official academic or identity information.",
        ],
      },
    ],
    checks: ["Timetable checked", "Homework planned", "Updates read", "Private data protected"],
  },
};

const quickLinks: Record<GuideRole, QuickLink[]> = {
  SUPER_ADMIN: [
    { label: "Manage schools", description: "Create workspaces, logos, and route access.", href: "schools" },
    { label: "School setup", description: "Build the academic foundation in order.", href: "setup" },
    { label: "User accounts", description: "Create and protect staff access.", href: "users" },
    { label: "Audit logs", description: "Review sensitive activity across the school.", href: "audit-logs" },
  ],
  SCHOOL_ADMIN: [
    { label: "Open dashboard", description: "Start with today's school-wide exceptions.", href: "dashboard" },
    { label: "Academic setup", description: "Maintain years, classes, subjects, and allocations.", href: "setup" },
    { label: "Attendance overview", description: "Check completion and low-attendance cases.", href: "attendance/dashboard" },
    { label: "Management analytics", description: "Review trends and operational performance.", href: "management-analytics" },
  ],
  TEACHER: [
    { label: "My dashboard", description: "Review today's teaching work.", href: "teacher/dashboard" },
    { label: "Mark attendance", description: "Complete the correct class register.", href: "attendance" },
    { label: "Homework", description: "Publish work to assigned classes.", href: "homework" },
    { label: "Teacher timetable", description: "Review your daily schedule.", href: "timetable/teacher" },
  ],
  ACCOUNTANT: [
    { label: "Fee overview", description: "Review collections and outstanding balances.", href: "fees/dashboard" },
    { label: "Collect fees", description: "Record a verified student payment.", href: "fees/collection" },
    { label: "Payment history", description: "Confirm receipts and avoid duplicates.", href: "fees/payments" },
    { label: "Expenses", description: "Record and reconcile school expenses.", href: "expenses" },
  ],
  RECEPTIONIST: [
    { label: "Front desk dashboard", description: "Review today's operational work.", href: "dashboard" },
    { label: "Online admissions", description: "Verify and process applications.", href: "admissions" },
    { label: "Visitors", description: "Manage check-in and check-out.", href: "visitors" },
    { label: "Student pickup", description: "Verify and record authorized pickup.", href: "student-pickup" },
  ],
  PARENT: [
    { label: "Student space", description: "Choose a child and open their overview.", href: "my" },
    { label: "Notifications", description: "Read school and student updates.", href: "my/notifications" },
    { label: "Calendar", description: "Review events and important dates.", href: "my/calendar" },
    { label: "Settings", description: "Manage this device and notification preferences.", href: "my/settings" },
  ],
  STUDENT: [
    { label: "Student space", description: "Open your personal academic overview.", href: "my" },
    { label: "Notifications", description: "Read school and class updates.", href: "my/notifications" },
    { label: "Calendar", description: "Review events and important dates.", href: "my/calendar" },
    { label: "Settings", description: "Review your account and device options.", href: "my/settings" },
  ],
};

const studentSpaceScreenshots: GuideScreenshot[] = [
  {
    src: "/product-screenshots/student-overview.png",
    title: "Student overview",
    description: "Attendance, fees, homework, exams, and services in one mobile workspace.",
  },
  {
    src: "/product-screenshots/student-attendance.png",
    title: "Attendance",
    description: "Review the daily record and overall attendance percentage.",
  },
  {
    src: "/product-screenshots/student-homework.png",
    title: "Homework",
    description: "See active assignments, instructions, subjects, and due dates.",
  },
];

const accessSteps: Record<GuideRole, string[]> = {
  SUPER_ADMIN: [
    "On a new installation, open /onboarding and sign in with Clerk, or create a Clerk account from the same screen.",
    "Enter the private bootstrap secret and create the first school. This one-time step creates the first SUPER_ADMIN membership.",
    "After initial setup, open the existing school workspace. Create every additional school from Schools → Add School, not from onboarding.",
    "Confirm the school name and Super Admin role in the header before changing data.",
  ],
  SCHOOL_ADMIN: [
    "Ask the Super Admin to create your active Principal or School Admin account and share the correct school link.",
    "Open the school link, enter your registered mobile number, and verify the WhatsApp OTP.",
    "Choose the Principal or School Admin profile if the number has more than one role.",
    "Confirm the school name and role in the header before beginning setup or daily operations.",
  ],
  TEACHER: [
    "Ask the school administrator to create your Teacher record, link your login, and assign your classes and subjects.",
    "Open the school link, enter your registered mobile number, and verify the WhatsApp OTP.",
    "Choose the Teacher profile if the number has more than one account or role.",
    "Open My Dashboard and confirm that your classes, subjects, and timetable are visible before marking attendance.",
  ],
  ACCOUNTANT: [
    "Ask the school administrator to create your Accountant account and enable only the financial and operational modules you need.",
    "Open the school link, enter your registered mobile number, and verify the WhatsApp OTP.",
    "Choose the Accountant profile if the number has more than one account or role.",
    "Confirm the school name, role, current academic year, and opening balances before recording payments.",
  ],
  RECEPTIONIST: [
    "Ask the school administrator to create your Receptionist account and enable the approved front-office modules.",
    "Open the school link, enter your registered mobile number, and verify the WhatsApp OTP.",
    "Choose the Receptionist profile if the number has more than one account or role.",
    "Confirm access to admissions, students, visitors, pickup, and other assigned front-office pages.",
  ],
  PARENT: [
    "Ask the school to link your registered mobile number to the correct child or children.",
    "Open the school link, enter that mobile number, and verify the WhatsApp OTP.",
    "Choose the Parent profile, then select a child when more than one student is linked.",
    "Confirm the child's name and school before viewing records, paying fees, or submitting a request.",
  ],
  STUDENT: [
    "Ask the school to activate your Student login and confirm the registered mobile number.",
    "Open the school link, enter the registered number, and verify the WhatsApp OTP.",
    "Choose the Student profile if the number has more than one account or role.",
    "Confirm your name, class, section, and school before using Student Space.",
  ],
};

function isGuideRole(role: string): role is GuideRole {
  return guideRoles.includes(role as GuideRole);
}

export function RoleUserGuide({
  currentRole,
  backHref,
  schoolSlug,
}: {
  currentRole: string;
  backHref: string;
  schoolSlug: string;
}) {
  const initialRole = isGuideRole(currentRole) ? currentRole : "STUDENT";
  const [selectedRole, setSelectedRole] = useState<GuideRole>(initialRole);
  const [search, setSearch] = useState("");
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const guide = guides[selectedRole];
  const currentLabel = isGuideRole(currentRole) ? guides[currentRole].label : currentRole;
  const isCurrentRoleGuide = selectedRole === currentRole;
  const totalSteps = accessSteps[selectedRole].length + guide.start.length + guide.sections.reduce((total, section) => total + section.steps.length, 0);
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progress = totalSteps ? Math.round((completedCount / totalSteps) * 100) : 0;
  const screenshots = selectedRole === "PARENT" || selectedRole === "STUDENT"
    ? studentSpaceScreenshots
    : [];
  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return guide.sections;
    return guide.sections.filter((section) =>
      [section.title, section.description, ...section.steps]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [guide, search]);

  function chooseRole(role: GuideRole) {
    setSelectedRole(role);
    setSearch("");
    setCompletedSteps({});
  }

  function toggleStep(id: string) {
    setCompletedSteps((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}><ArrowLeft className="size-4" /> Back</Link>
        </Button>
        <Badge variant="secondary">Signed in as {currentLabel}</Badge>
      </div>

      <section className="relative overflow-hidden rounded-[36px] border border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/90 to-violet-100/80 p-6 text-slate-950 shadow-[0_32px_90px_rgba(79,70,229,0.13)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-indigo-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_280px] lg:items-end">
          <div className="max-w-3xl">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-[0_14px_30px_rgba(79,70,229,0.28)]"><BookOpenCheck className="size-6" /></span>
            <p className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600"><Sparkles className="size-3.5" /> SchoolDB guided help center</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-5xl">{guide.label} user guide</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{guide.summary}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="rounded-xl shadow-lg shadow-indigo-500/15">
                <a href="#first-steps">Start from the beginning <ArrowRight className="size-4" /></a>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-indigo-200 bg-white/75">
                <Link href={backHref}>Open my workspace</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-xl shadow-indigo-900/5 backdrop-blur">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Guide progress</p>
                <p className="mt-1 text-3xl font-black tracking-tight text-indigo-700">{progress}%</p>
              </div>
              <p className="text-xs font-semibold text-slate-500">{completedCount} of {totalSteps} steps</p>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-indigo-100">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <button type="button" onClick={() => setCompletedSteps({})} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-indigo-700">
              <RotateCcw className="size-3.5" /> Reset progress
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="role-guide-heading">
        <div className="mb-3 flex items-center gap-2">
          <CircleHelp className="size-4 text-primary" />
          <h2 id="role-guide-heading" className="text-sm font-bold">Choose a role guide</h2>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-2" role="tablist" aria-label="Role guides">
          {guideRoles.map((role) => (
            <button
              key={role}
              type="button"
              role="tab"
              aria-selected={selectedRole === role}
              onClick={() => chooseRole(role)}
              className={cn(
                "shrink-0 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                selectedRole === role
                  ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/20"
                  : "border-border/70 bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-md hover:shadow-primary/10",
              )}
            >
              {guides[role].shortLabel}
              {role === currentRole ? " · You" : ""}
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-sm dark:border-sky-900/50 dark:from-sky-950/20 dark:via-background dark:to-indigo-950/20">
        <div className="grid lg:grid-cols-[280px_1fr]">
          <div className="border-b border-sky-200/60 p-6 lg:border-b-0 lg:border-r lg:p-8 dark:border-sky-900/50">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20"><KeyRound className="size-5" /></span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Begin here</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Account to workspace</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">The complete first-access path for a {guide.label}.</p>
          </div>
          <ol className="grid gap-px bg-sky-200/60 sm:grid-cols-2 dark:bg-sky-900/50">
            {accessSteps[selectedRole].map((step, index) => {
              const id = `access-${index}`;
              const done = Boolean(completedSteps[id]);
              return (
                <li key={step} className="bg-background/90 p-5 sm:p-6">
                  <button type="button" onClick={() => toggleStep(id)} className="flex w-full gap-4 text-left">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-black transition", done ? "bg-emerald-600 text-white" : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300")}>
                      {done ? <Check className="size-4" /> : index + 1}
                    </span>
                    <span>
                      <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Step {index + 1}</span>
                      <span className={cn("mt-1 block text-sm leading-6", done && "text-muted-foreground line-through decoration-emerald-500/50")}>{step}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Go directly to the work</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Quick actions</h2>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">
            {isCurrentRoleGuide ? "Links open inside the current school" : "Sign in with this role to open its workspace links"}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks[selectedRole].map((item, index) => {
            const content = (
              <>
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-2xl bg-indigo-500/10 text-sm font-black text-indigo-600">{index + 1}</span>
                {isCurrentRoleGuide ? <ExternalLink className="size-4 text-muted-foreground transition group-hover:text-indigo-600" /> : <LockKeyhole className="size-4 text-muted-foreground" />}
              </div>
              <h3 className="mt-5 font-bold">{item.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </>
            );

            return isCurrentRoleGuide ? (
              <Link key={item.href} href={`/${schoolSlug}/${item.href}`} className="group rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10">
                {content}
              </Link>
            ) : (
              <div key={item.href} className="rounded-3xl border border-border/60 bg-muted/20 p-5 opacity-80">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <div id="first-steps" className="grid scroll-mt-24 gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-5">
          <Card className="rounded-[28px] border-amber-200/70 bg-gradient-to-br from-amber-50 to-white shadow-sm dark:border-amber-900/50 dark:from-amber-950/20 dark:to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Lightbulb className="size-5 text-amber-500" /> First login checklist</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">Complete these steps before beginning daily work.</p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {guide.start.map((step, index) => {
                  const id = `start-${index}`;
                  const done = Boolean(completedSteps[id]);
                  return (
                    <li key={step}>
                      <button type="button" onClick={() => toggleStep(id)} className={cn("flex w-full gap-3 rounded-2xl border px-4 py-3 text-left text-sm leading-6 transition", done ? "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100" : "border-border/60 bg-background/80 hover:border-primary/30")}>
                        <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", done ? "bg-emerald-600 text-white" : "bg-primary/10 text-primary")}>
                          {done ? <Check className="size-3.5" /> : index + 1}
                        </span>
                        <span className={cn(done && "line-through decoration-emerald-500/50")}>{step}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-emerald-200/70 bg-emerald-50/50 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="size-5 text-emerald-600" /> End-of-day check</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {guide.checks.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-background/80 px-4 py-3 text-sm font-medium">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5" aria-live="polite">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search the ${guide.shortLabel} guide`} className="h-12 w-full rounded-2xl border border-border/70 bg-card pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </div>

          {filteredSections.map((section) => {
            const sectionIndex = guide.sections.indexOf(section);
            return (
              <Card key={section.title} className="overflow-hidden rounded-[28px] border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/50 bg-muted/20">
                  <div className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/15">{sectionIndex + 1}</span>
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"><Clock3 className="size-3.5" /> Guided workflow</p>
                      <CardTitle className="mt-1 text-xl">{section.title}</CardTitle>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 sm:p-6">
                  <ol className="space-y-3">
                    {section.steps.map((step, stepIndex) => {
                      const id = `section-${sectionIndex}-${stepIndex}`;
                      const done = Boolean(completedSteps[id]);
                      return (
                        <li key={step}>
                          <button type="button" onClick={() => toggleStep(id)} className={cn("group flex w-full gap-3 rounded-2xl border px-4 py-3 text-left text-sm leading-6 transition", done ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/25" : "border-transparent bg-muted/35 hover:border-primary/20 hover:bg-primary/[0.035]")}>
                            <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black", done ? "bg-emerald-600 text-white" : "bg-background text-primary shadow-sm ring-1 ring-border")}>
                              {done ? <Check className="size-3.5" /> : stepIndex + 1}
                            </span>
                            <span className={cn(done && "text-muted-foreground line-through decoration-emerald-500/50")}>{step}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            );
          })}

          {filteredSections.length === 0 && (
            <div className="rounded-3xl border border-dashed p-10 text-center">
              <Search className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 font-bold">No guide steps found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try another word or clear the search.</p>
            </div>
          )}
        </div>
      </div>

      {screenshots.length > 0 && (
        <section>
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Real product screens</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">See the flow before you begin</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">These mobile screenshots show the main Student Space experience used by students and linked parents.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {screenshots.map((screenshot) => (
              <a key={screenshot.src} href={screenshot.src} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[30px] border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10">
                <div className="relative aspect-[9/14] overflow-hidden bg-slate-100">
                  <Image src={screenshot.src} alt={screenshot.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover object-top transition duration-500 group-hover:scale-[1.02]" />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold">{screenshot.title}</h3>
                    <ExternalLink className="size-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{screenshot.description}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <SupportCard icon={CloudOff} title="Offline work" text="Sync while online first. Saved information and supported pending work remain available on this trusted device. Reconnect and confirm pending requests reach zero." />
        <SupportCard icon={LockKeyhole} title="Protect school data" text="Never share OTPs, passkeys, payment details, student documents, or exported reports. Sign out after using a shared device." />
        <SupportCard icon={Search} title="Missing a menu?" text="Menus depend on school route access, your role, and individual permissions. Ask the Principal/Admin to review all three." />
      </section>

      <div className="flex flex-col gap-3 rounded-3xl border border-indigo-200/70 bg-indigo-50/60 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-900/50 dark:bg-indigo-950/20">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-indigo-600" />
          <div>
            <p className="font-bold">Need more help?</p>
            <p className="mt-1 text-sm text-muted-foreground">Use Queries for staff support, or contact the school office for account and record corrections.</p>
          </div>
        </div>
        <Button asChild variant="outline"><Link href={backHref}><KeyRound className="size-4" /> Return to workspace</Link></Button>
      </div>
    </div>
  );
}

function SupportCard({ icon: Icon, title, text }: { icon: typeof CloudOff; title: string; text: string }) {
  return (
    <Card className="rounded-3xl border-border/60">
      <CardContent className="p-5">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
        <h2 className="mt-4 font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

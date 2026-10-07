"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  CloudOff,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  Search,
  ShieldCheck,
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

function isGuideRole(role: string): role is GuideRole {
  return guideRoles.includes(role as GuideRole);
}

export function RoleUserGuide({
  currentRole,
  backHref,
}: {
  currentRole: string;
  backHref: string;
}) {
  const initialRole = isGuideRole(currentRole) ? currentRole : "STUDENT";
  const [selectedRole, setSelectedRole] = useState<GuideRole>(initialRole);
  const guide = guides[selectedRole];
  const currentLabel = isGuideRole(currentRole) ? guides[currentRole].label : currentRole;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}><ArrowLeft className="size-4" /> Back</Link>
        </Button>
        <Badge variant="secondary">Signed in as {currentLabel}</Badge>
      </div>

      <section className="relative overflow-hidden rounded-[32px] border border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/80 to-violet-100/70 p-6 text-slate-950 shadow-[0_28px_80px_rgba(79,70,229,0.10)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-indigo-300/25 blur-3xl" />
        <div className="relative max-w-3xl">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg"><BookOpenCheck className="size-6" /></span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">SchoolDB help center</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">{guide.label} user guide</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{guide.summary}</p>
        </div>
      </section>

      <section aria-labelledby="role-guide-heading">
        <div className="mb-3 flex items-center gap-2">
          <CircleHelp className="size-4 text-primary" />
          <h2 id="role-guide-heading" className="text-sm font-bold">Choose a role guide</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Role guides">
          {guideRoles.map((role) => (
            <button
              key={role}
              type="button"
              role="tab"
              aria-selected={selectedRole === role}
              onClick={() => setSelectedRole(role)}
              className={cn(
                "shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                selectedRole === role
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-card hover:border-primary/30 hover:bg-primary/[0.03]",
              )}
            >
              {guides[role].shortLabel}
              {role === currentRole ? " · You" : ""}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-5">
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Lightbulb className="size-5 text-amber-500" /> Start here</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {guide.start.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-6">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-emerald-200/70 bg-emerald-50/50 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="size-5 text-emerald-600" /> Before you finish</CardTitle>
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
          {guide.sections.map((section, sectionIndex) => (
            <Card key={section.title} className="rounded-3xl border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary">{sectionIndex + 1}</span>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 pl-1">
                  {section.steps.map((step) => (
                    <li key={step} className="flex gap-3 text-sm leading-6">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

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

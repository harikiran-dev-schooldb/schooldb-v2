import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageSquareText } from "lucide-react";

import { PublicPage } from "@/components/public-site/PublicSiteShell";
import { publicBusiness } from "@/lib/public-business";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | SchoolDB",
  description:
    "Answers about SchoolDB features, onboarding, mobile access, pricing, support, privacy and data security.",
};

const faqGroups = [
  {
    title: "Platform and everyday use",
    intro: "How SchoolDB fits the people and workflows across a school.",
    questions: [
      [
        "What does SchoolDB manage?",
        "SchoolDB connects admissions, student records, academic structure, attendance, examinations, fees, homework, communication, reports, library, transport and related operational workflows. A school can agree to a rollout scope that reflects the modules it needs.",
      ],
      [
        "Do administrators, teachers, parents and students use the same workspace?",
        "No. Each person signs in to a role-aware experience. Administrators work with school operations, teachers see assigned academic work, and families and students receive focused self-service access to relevant records.",
      ],
      [
        "Is SchoolDB available on mobile?",
        "Yes. The web application supports detailed school administration, while the Android experience provides focused workflows for school teams, students and families.",
      ],
      [
        "Can our school start with only selected modules?",
        "Yes. The selected modules, onboarding work and commercial scope are documented in the school’s written quotation before launch.",
      ],
    ],
  },
  {
    title: "Onboarding and school data",
    intro: "What happens between a demonstration and go-live.",
    questions: [
      [
        "How does onboarding begin?",
        "We first understand the school’s academic structure, roles, current records and priority workflows. We then agree the configuration, data preparation and rollout scope.",
      ],
      [
        "Can existing records be imported?",
        "SchoolDB includes guided bulk operations for common school data. The exact import plan depends on the format, completeness and quality of the records supplied by the school.",
      ],
      [
        "How long does implementation take?",
        "Timing depends on the selected modules, data readiness, integrations and number of users to onboard. A practical implementation plan is agreed after discovery rather than promising a generic timeline.",
      ],
      [
        "Does our school retain responsibility for its records?",
        "Yes. The school controls the institutional records it enters and remains responsible for their accuracy, lawful use, academic decisions, fee policies and user access approvals.",
      ],
    ],
  },
  {
    title: "Security and privacy",
    intro: "How access boundaries and sensitive information are handled.",
    questions: [
      [
        "How is access controlled?",
        "SchoolDB combines authenticated accounts with active school membership, role checks, permission checks and school-specific data filters. Users see only the areas and records permitted for their role and school context.",
      ],
      [
        "Are uploaded documents public?",
        "Sensitive documents are stored using private storage controls and are delivered through authenticated application routes that check school and user access before returning a file.",
      ],
      [
        "Does SchoolDB sell personal information?",
        "No. SchoolDB does not sell personal information. Data is used to provide, secure and support the service as described in the privacy policy.",
      ],
      [
        "Where can we review the security approach?",
        "Our Data Security & Trust page explains the implemented access model, private-file handling, audit records, platform safeguards and the responsibilities shared with each school.",
      ],
    ],
  },
  {
    title: "Pricing, payments and support",
    intro: "Commercial scope and what schools can expect after launch.",
    questions: [
      [
        "How is SchoolDB priced?",
        "Pricing is supplied in a written INR quotation based on factors such as student count, selected modules, onboarding needs and subscription term. Included services, taxes and payment schedule are shown before payment.",
      ],
      [
        "Does SchoolDB store card details or UPI PINs?",
        "No. Online payments are handled by the payment provider and participating banks or networks. SchoolDB keeps the transaction references and status needed for reconciliation, not complete card details, UPI PINs or banking passwords.",
      ],
      [
        "What support is available?",
        "The agreed onboarding and subscription scope defines the support path. Schools can contact SchoolDB for product, account, payment and privacy enquiries using the published email and phone details.",
      ],
      [
        "How can we see the platform before subscribing?",
        "Request a personalised demonstration. We will focus the walkthrough on your school’s roles, processes and priority modules, then discuss a suitable rollout scope.",
      ],
    ],
  },
] as const;

export default function FrequentlyAskedQuestionsPage() {
  return (
    <PublicPage
      eyebrow="SchoolDB help centre"
      title="Frequently asked questions"
      intro="Clear answers for school leaders, administrators, teachers and families evaluating or using SchoolDB."
    >
      <div className="grid gap-5">
        {faqGroups.map((group) => (
          <section
            key={group.title}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-7"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
              {group.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {group.intro}
            </p>
            <div className="mt-5 space-y-3">
              {group.questions.map(([question, answer]) => (
                <details
                  key={question}
                  className="group rounded-xl border border-slate-200/80 bg-slate-50/55 p-4 open:border-indigo-200 open:bg-indigo-50/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-slate-900 marker:content-none">
                    {question}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-lg font-medium text-indigo-600 shadow-sm ring-1 ring-slate-200/70 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 border-t border-slate-200/70 pt-4 text-sm leading-6 text-slate-600">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.15)] sm:p-8">
        <MessageSquareText className="size-6 text-indigo-300" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          Have a question specific to your school?
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Tell us about your academic structure, current system and priorities.
          We will answer directly and shape the demonstration around your needs.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={`mailto:${publicBusiness.email}?subject=SchoolDB%20question`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-400"
          >
            Ask SchoolDB <ArrowRight className="size-4" />
          </a>
          <Link
            href="/security"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"
          >
            Review data security
          </Link>
        </div>
      </section>
    </PublicPage>
  );
}

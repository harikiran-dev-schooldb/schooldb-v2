import type { Metadata } from "next";
import Link from "next/link";

import {
  ContentCard,
  PublicPage,
} from "@/components/public-site/PublicSiteShell";
import { publicBusiness } from "@/lib/public-business";

export const metadata: Metadata = {
  title: "About SchoolDB",
  description: "Learn about SchoolDB and SchoolDB Education Technologies.",
};

export default function AboutPage() {
  return (
    <PublicPage
      eyebrow="About us"
      title="School operations, made clearer."
      intro="SchoolDB is a school administration and operations platform built by SchoolDB Education Technologies for schools in India."
    >
      <ContentCard title="What SchoolDB does">
        <p>
          SchoolDB brings admissions, student records, academics, attendance,
          examinations, fees, expenses, communication, library and transport
          workflows into one connected workspace.
        </p>
        <p>
          We provide the technology platform. Each school remains responsible
          for its academic decisions, fee policies, student records and
          day-to-day administration.
        </p>
      </ContentCard>
      <ContentCard title="Our business">
        <p>
          <strong className="text-slate-800">Legal name:</strong>{" "}
          {publicBusiness.legalName}
        </p>
        <p>
          <strong className="text-slate-800">Enterprise type:</strong>{" "}
          Proprietary micro enterprise providing computer programming and
          related services.
        </p>
        <p>
          <strong className="text-slate-800">Udyam registration:</strong>{" "}
          {publicBusiness.udyamNumber}
        </p>
        <address className="not-italic">
          <strong className="text-slate-800">Registered address:</strong>
          <br />
          {publicBusiness.addressLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </address>
      </ContentCard>
      <ContentCard title="Subscriptions and pricing">
        <p>
          SchoolDB is offered as a subscription service. Pricing is provided as
          a written quotation in Indian rupees (INR) based on the school&apos;s
          student count, selected modules, onboarding needs and subscription
          term.
        </p>
        <p>
          The exact amount, included services, taxes and payment schedule are
          shown to the school and accepted before any subscription payment is
          collected.{" "}
          <Link
            href="/contact"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Contact us for a quotation.
          </Link>
        </p>
      </ContentCard>
    </PublicPage>
  );
}

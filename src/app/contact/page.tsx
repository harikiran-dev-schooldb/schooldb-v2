import type { Metadata } from "next";

import {
  ContentCard,
  PublicPage,
} from "@/components/public-site/PublicSiteShell";
import { publicBusiness } from "@/lib/public-business";

export const metadata: Metadata = {
  title: "Contact SchoolDB",
  description:
    "Contact SchoolDB Education Technologies for support, payments or product enquiries.",
};

export default function ContactPage() {
  return (
    <PublicPage
      eyebrow="Contact"
      title="How can we help?"
      intro="Contact us for product demonstrations, subscription quotations, account support, payment questions or privacy requests."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <ContentCard title="Email and phone">
          <p>
            <strong className="text-slate-800">Email</strong>
            <br />
            <a
              href={`mailto:${publicBusiness.email}`}
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {publicBusiness.email}
            </a>
          </p>
          <p>
            <strong className="text-slate-800">Phone</strong>
            <br />
            <a
              href={`tel:${publicBusiness.phoneHref}`}
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {publicBusiness.phone}
            </a>
          </p>
          <p>
            For payment support, include the school name, student name, order or
            receipt reference, transaction date and amount. Never send card, UPI
            PIN, OTP or banking passwords.
          </p>
        </ContentCard>
        <ContentCard title="Registered office">
          <address className="not-italic">
            {publicBusiness.legalName}
            <br />
            {publicBusiness.addressLines.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </address>
          <p>Udyam registration: {publicBusiness.udyamNumber}</p>
        </ContentCard>
      </div>
    </PublicPage>
  );
}

import type { Metadata } from "next";

import {
  ContentCard,
  PublicPage,
} from "@/components/public-site/PublicSiteShell";
import { policyEffectiveDate, publicBusiness } from "@/lib/public-business";

export const metadata: Metadata = {
  title: "Privacy Policy | SchoolDB",
  description:
    "How SchoolDB collects, uses, shares and protects personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <PublicPage
      eyebrow={`Effective ${policyEffectiveDate}`}
      title="Privacy policy"
      intro="This policy explains how SchoolDB Education Technologies handles information when schools, staff, students and guardians use SchoolDB."
    >
      <ContentCard title="Information we handle">
        <p>
          Depending on the services a school enables, we may process identity
          and contact details; student, guardian and staff records; admission
          and academic information; attendance, fee and receipt records;
          uploaded documents; support communications; and technical information
          such as device, browser, IP address and activity logs.
        </p>
        <p>
          Schools decide what institutional data is entered into SchoolDB and
          are responsible for having an appropriate basis to collect and use it.
        </p>
      </ContentCard>
      <ContentCard title="How information is used">
        <p>
          We use information to provide and secure the platform, authenticate
          users, support school operations, process and reconcile payments,
          issue receipts, respond to support requests, prevent fraud, maintain
          audit records, improve reliability and comply with applicable law.
        </p>
        <p>We do not sell personal information.</p>
      </ContentCard>
      <ContentCard title="Payments and service providers">
        <p>
          Online payments are processed by Cashfree Payments and relevant banks
          or payment networks. SchoolDB receives transaction identifiers and
          payment status needed for reconciliation, but does not store complete
          card details, UPI PINs or banking passwords.
        </p>
        <p>
          We may use carefully selected hosting, database, communications,
          file-storage, analytics and support providers where needed to operate
          SchoolDB. Information may also be disclosed when required by law, to
          protect users and the service, or as part of a lawful business
          transfer.
        </p>
      </ContentCard>
      <ContentCard title="Retention and security">
        <p>
          We retain information for as long as necessary to provide the service,
          meet a school&apos;s documented requirements, resolve disputes,
          maintain financial and audit records, and comply with legal
          obligations. Retention periods vary by record type and agreement.
        </p>
        <p>
          We use administrative and technical safeguards designed to protect
          information. No internet service can guarantee absolute security, so
          users should protect account credentials and promptly report suspected
          misuse.
        </p>
      </ContentCard>
      <ContentCard title="Your choices and contact">
        <p>
          Requests to access, correct or delete school-managed records should
          normally be made to the relevant school first. You may also contact us
          about privacy, consent withdrawal or a security concern at{" "}
          <a
            href={`mailto:${publicBusiness.email}`}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {publicBusiness.email}
          </a>
          . We may verify identity and coordinate with the school before acting.
        </p>
        <p>
          We may update this policy when our services or legal obligations
          change. The effective date above identifies the current version.
        </p>
      </ContentCard>
    </PublicPage>
  );
}

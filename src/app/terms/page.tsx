import type { Metadata } from "next";

import {
  ContentCard,
  PublicPage,
} from "@/components/public-site/PublicSiteShell";
import { policyEffectiveDate, publicBusiness } from "@/lib/public-business";

export const metadata: Metadata = {
  title: "Terms and Conditions | SchoolDB",
  description: "Terms governing access to and use of the SchoolDB platform.",
};

export default function TermsPage() {
  return (
    <PublicPage
      eyebrow={`Effective ${policyEffectiveDate}`}
      title="Terms and conditions"
      intro="These terms govern access to SchoolDB, a technology platform provided by SchoolDB Education Technologies. A written school subscription agreement or quotation may include additional terms."
    >
      <ContentCard title="Using SchoolDB">
        <p>
          Users must provide accurate information, use only accounts they are
          authorised to access, protect login credentials and follow the
          relevant school&apos;s policies. Schools are responsible for user
          access, the accuracy and lawful use of records they enter, and their
          academic, administrative and fee decisions.
        </p>
        <p>
          You must not misuse the service, attempt unauthorised access,
          interfere with its operation, upload harmful material, violate another
          person&apos;s rights or use SchoolDB for unlawful activity.
        </p>
      </ContentCard>
      <ContentCard title="Subscriptions, fees and taxes">
        <p>
          Subscription scope and pricing are provided in a written quotation in
          Indian rupees (INR) based on selected services. The quotation or order
          identifies the amount, taxes, billing schedule and subscription term
          before payment.
        </p>
        <p>
          School fees paid through SchoolDB are charged by the relevant school.
          SchoolDB provides the payment and record-keeping technology; the
          school remains responsible for its fee schedule, concessions and
          refund decisions.
        </p>
      </ContentCard>
      <ContentCard title="Online payments">
        <p>
          Payments may be processed by Cashfree Payments and participating
          payment providers. A payment is treated as complete only after its
          verified status is recorded. Bank or network delays can temporarily
          leave a transaction pending. Users should not make a second payment
          until the first transaction&apos;s status has been checked.
        </p>
        <p>
          Applicable refunds and cancellations are described in our refund
          policy and any school-specific policy presented with the charge.
        </p>
      </ContentCard>
      <ContentCard title="Platform availability and ownership">
        <p>
          We work to keep SchoolDB secure and available, but maintenance,
          upgrades, internet failures or third-party services may occasionally
          interrupt access. We may make reasonable changes to improve or secure
          the platform.
        </p>
        <p>
          SchoolDB software, branding and platform content remain the property
          of {publicBusiness.legalName} or its licensors. Schools retain rights
          in their institutional data, subject to the permissions needed for us
          to provide the service.
        </p>
      </ContentCard>
      <ContentCard title="Responsibility and applicable law">
        <p>
          To the extent permitted by law, each party is responsible for losses
          caused by its breach, negligence or unlawful conduct. Nothing in these
          terms excludes rights or remedies that cannot legally be excluded.
          Specific service levels, liability limits and termination rights may
          be set out in the school&apos;s written agreement.
        </p>
        <p>
          These terms are governed by the laws of India. Disputes that cannot be
          resolved directly will be subject to the courts with jurisdiction in
          Andhra Pradesh, unless applicable law requires otherwise.
        </p>
      </ContentCard>
      <ContentCard title="Contact">
        <p>
          Questions about these terms may be sent to{" "}
          <a
            href={`mailto:${publicBusiness.email}`}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {publicBusiness.email}
          </a>{" "}
          or raised using the details on our contact page.
        </p>
      </ContentCard>
    </PublicPage>
  );
}

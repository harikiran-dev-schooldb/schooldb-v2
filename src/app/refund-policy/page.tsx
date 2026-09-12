import type { Metadata } from "next";

import {
  ContentCard,
  PublicPage,
} from "@/components/public-site/PublicSiteShell";
import { policyEffectiveDate, publicBusiness } from "@/lib/public-business";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy | SchoolDB",
  description:
    "Refund and cancellation process for payments made through SchoolDB.",
};

export default function RefundPolicyPage() {
  return (
    <PublicPage
      eyebrow={`Effective ${policyEffectiveDate}`}
      title="Refund and cancellation policy"
      intro="This policy explains how school-fee payment issues and SchoolDB subscription cancellations are handled."
    >
      <ContentCard title="School fee payments">
        <p>
          Each school sets its own fees, concessions, cancellation rules and
          refund eligibility. SchoolDB provides the technology used to initiate
          and record the payment but does not independently change a
          school&apos;s fee policy.
        </p>
        <p>
          Refund requests for a valid completed fee payment must be approved by
          the relevant school. Once approved and initiated, the refund is
          returned to the original payment method. The receiving time depends on
          Cashfree, the payment network and the customer&apos;s bank.
        </p>
      </ContentCard>
      <ContentCard title="Duplicate, failed or debited payments">
        <p>
          If an account is debited more than once, or is debited while SchoolDB
          shows the payment as failed or pending, contact us or the school
          within 7 days. Provide the school name, student name, order or receipt
          reference, date and amount. Do not share an OTP, UPI PIN, complete
          card number or banking password.
        </p>
        <p>
          We will check the verified gateway and school records. Automatically
          reversed transactions are returned by the bank or payment provider.
          Where a separate refund is required, it will be initiated after the
          transaction and eligibility are confirmed.
        </p>
      </ContentCard>
      <ContentCard title="SchoolDB subscriptions">
        <p>
          Schools receive a written INR quotation or order describing the
          subscription term, included services, onboarding work, payment
          schedule and applicable cancellation terms before purchase.
        </p>
        <p>
          A cancellation requested before service or onboarding begins may be
          reviewed for a refund. After work or access has begun, the refundable
          amount, if any, is determined from the unused service and committed
          onboarding work under the accepted quotation or agreement. Statutory
          rights remain unaffected.
        </p>
      </ContentCard>
      <ContentCard title="How to request help">
        <p>
          Email{" "}
          <a
            href={`mailto:${publicBusiness.email}`}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {publicBusiness.email}
          </a>{" "}
          or call{" "}
          <a
            href={`tel:${publicBusiness.phoneHref}`}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {publicBusiness.phone}
          </a>
          . We will acknowledge the request, verify it with the relevant school
          or provider, and communicate the outcome using the supplied contact
          details.
        </p>
      </ContentCard>
    </PublicPage>
  );
}

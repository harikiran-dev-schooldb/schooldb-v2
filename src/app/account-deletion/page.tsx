import type { Metadata } from "next";

import {
  ContentCard,
  PublicPage,
} from "@/components/public-site/PublicSiteShell";
import { policyEffectiveDate, publicBusiness } from "@/lib/public-business";

export const metadata: Metadata = {
  title: "Account Deletion | SchoolDB",
  description:
    "Request deletion of a SchoolDB app account and its associated personal data.",
};

const deletionEmail = `mailto:${publicBusiness.email}?subject=${encodeURIComponent(
  "SchoolDB account deletion request",
)}&body=${encodeURIComponent(
  "Please delete my SchoolDB account.\n\nFull name:\nRegistered email or phone:\nSchool name:\nRole (student, guardian or staff):\nStudent admission number, if applicable:\n",
)}`;

export default function AccountDeletionPage() {
  return (
    <PublicPage
      eyebrow={`Effective ${policyEffectiveDate}`}
      title="Delete your SchoolDB account"
      intro="Users of the SchoolDB app can request deletion of their account and associated personal data without reinstalling or signing in to the app."
    >
      <ContentCard title="Submit a deletion request">
        <p>
          Email us from the email address connected to your SchoolDB account.
          Include your full name, registered email address or phone number,
          school name, account role and student admission number where
          applicable. Do not send passwords, OTPs, UPI PINs or banking details.
        </p>
        <p>
          <a
            href={deletionEmail}
            className="inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,0.18)] hover:bg-indigo-700"
          >
            Request account deletion
          </a>
        </p>
        <p>
          You can also email{" "}
          <a
            href={`mailto:${publicBusiness.email}`}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {publicBusiness.email}
          </a>{" "}
          with the subject “SchoolDB account deletion request”.
        </p>
      </ContentCard>

      <ContentCard title="What happens next">
        <ol className="list-decimal space-y-2 pl-5">
          <li>We acknowledge the request and verify that you own the account.</li>
          <li>
            For a school-managed account, we may coordinate with the relevant
            school to protect student and institutional records.
          </li>
          <li>
            After verification, we disable access and complete eligible account
            and personal-data deletion, normally within 30 days.
          </li>
          <li>We confirm completion using the contact details you provided.</li>
        </ol>
      </ContentCard>

      <ContentCard title="Data that is deleted">
        <p>
          Subject to verification and applicable retention requirements, we
          delete the user login profile, authentication associations, active
          sessions, device or notification tokens, user preferences, and other
          personal information that is no longer required to provide or secure
          the service.
        </p>
        <p>
          You may also use the same process to request deletion of specific
          personal data without requesting deletion of the entire account.
        </p>
      </ContentCard>

      <ContentCard title="Data that may be retained">
        <p>
          Schools may need to retain admission, academic, attendance, fee,
          receipt and audit records for institutional, accounting, fraud
          prevention, dispute resolution or legal obligations. Payment records
          may include an amount, date, receipt or transaction reference, but not
          a UPI PIN, OTP or banking password.
        </p>
        <p>
          Where retention is required, access is restricted and the information
          is retained only for the applicable school or legal retention period.
          Deleting a SchoolDB login does not automatically erase records that
          the school is independently required to maintain.
        </p>
      </ContentCard>

      <ContentCard title="Questions or cancellation">
        <p>
          To ask a question or cancel a pending deletion request, reply to the
          acknowledgement email before deletion is completed. You can contact
          {` ${publicBusiness.legalName}`} at{" "}
          <a
            href={`mailto:${publicBusiness.email}`}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {publicBusiness.email}
          </a>{" "}
          or{" "}
          <a
            href={`tel:${publicBusiness.phoneHref}`}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {publicBusiness.phone}
          </a>
          .
        </p>
      </ContentCard>
    </PublicPage>
  );
}

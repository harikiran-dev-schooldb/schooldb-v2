import type { Metadata } from "next";

import {
  ContentCard,
  PublicPage,
} from "@/components/public-site/PublicSiteShell";
import { policyEffectiveDate, publicBusiness } from "@/lib/public-business";

export const metadata: Metadata = {
  title: "Account and Data Deletion | SchoolDB",
  description:
    "Request deactivation of a SchoolDB account and deletion of eligible associated personal data.",
};

const deletionEmail = `mailto:${publicBusiness.email}?subject=${encodeURIComponent(
  "SchoolDB account deactivation and data deletion request",
)}&body=${encodeURIComponent(
  "Please deactivate my SchoolDB account and delete my eligible personal data.\n\nFull name:\nRegistered email or phone:\nSchool name:\nRole (student, guardian or staff):\nStudent admission number, if applicable:\n",
)}`;

export default function AccountDeletionPage() {
  return (
    <PublicPage
      eyebrow={`Effective ${policyEffectiveDate}`}
      title="SchoolDB account and data deletion"
      intro="Students, guardians and teachers can request that access to their school-managed SchoolDB account is deactivated and that eligible associated personal data is deleted, without reinstalling or signing in to the app."
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
            Request account deactivation and data deletion
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
          with the subject “SchoolDB account deactivation and data deletion
          request”.
        </p>
      </ContentCard>

      <ContentCard title="What happens next">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            We acknowledge the request and verify that you own the account.
          </li>
          <li>
            Student and teacher accounts are created and managed by an
            authorised school, rather than self-created inside the app. We
            coordinate with that school to verify the request and protect
            student and institutional records.
          </li>
          <li>
            After verification, the school-managed account is marked inactive,
            login access and active sessions are disabled, and eligible personal
            data is deleted, normally within 30 days.
          </li>
          <li>We confirm completion using the contact details you provided.</li>
        </ol>
      </ContentCard>

      <ContentCard title="Data that is deleted">
        <p>
          Subject to verification and applicable retention requirements, we
          delete active sessions, device or notification tokens, user
          preferences, optional profile information, support attachments and
          other personal information that is no longer required to provide,
          secure or document the school service. Authentication credentials are
          removed or disconnected when access is made inactive.
        </p>
        <p>
          You may also use the same process to request deletion of specific
          personal data without requesting deletion of the entire account.
        </p>
      </ContentCard>

      <ContentCard title="Data that may be retained">
        <p>
          The basic account record and its inactive status are retained so the
          school can preserve its institutional history and prevent unintended
          reactivation. Schools may also need to retain admission, academic,
          attendance, fee, receipt and audit records for institutional,
          accounting, fraud prevention, dispute resolution or legal obligations.
          Payment records may include an amount, date, receipt or transaction
          reference, but not a UPI PIN, OTP or banking password.
        </p>
        <p>
          Backup copies may remain for up to 90 days, and security or audit logs
          may be retained for up to 180 days. Fee, invoice, payment and receipt
          records may be retained for up to eight financial years, or longer
          where a legal claim or applicable law requires it. Academic, admission
          and attendance records are retained for the period set by the relevant
          school and applicable education requirements. Access to retained
          information is restricted.
        </p>
        <p>
          Deactivating a SchoolDB login does not erase records that the school
          is independently required to maintain. After the applicable retention
          period ends, the data is deleted or anonymised unless continued
          retention is legally required.
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

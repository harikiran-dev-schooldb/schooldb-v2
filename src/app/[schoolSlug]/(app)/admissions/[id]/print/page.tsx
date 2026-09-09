import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PrintDocumentButton } from "@/features/students/components/profile/PrintDocumentButton";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const show = (value: string | null | undefined) => value || "—";
const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default async function AdmissionPrintPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; id: string }>;
}) {
  const { schoolSlug, id } = await params;
  const actor = await requireRole(
    ["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"],
    schoolSlug,
  );
  const application = await prisma.admissionApplication.findFirst({
    where: { id, schoolId: actor.schoolId },
    include: {
      school: { select: { name: true } },
      academicYear: { select: { name: true } },
      applyingClass: { select: { name: true } },
      preferredSection: { select: { name: true } },
      documents: { orderBy: { createdAt: "asc" } },
      history: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!application) notFound();
  return (
    <div className="min-h-screen bg-slate-100 p-5 print:bg-white print:p-0">
      <div className="mx-auto mb-5 flex max-w-4xl justify-between print:hidden">
        <Button asChild variant="outline">
          <Link href={`/${schoolSlug}/admissions`}>
            <ArrowLeft />
            Back to admissions
          </Link>
        </Button>
        <PrintDocumentButton />
      </div>
      <main className="mx-auto min-h-[1050px] max-w-4xl border bg-white p-12 text-slate-950 shadow-xl print:min-h-screen print:border-0 print:shadow-none">
        <header className="border-b-2 border-slate-950 pb-6 text-center">
          <p className="text-3xl font-black uppercase">
            {application.school.name}
          </p>
          <p className="mt-2 text-xs font-bold tracking-[0.3em] text-slate-500 uppercase">
            Online admission application
          </p>
        </header>
        <div className="mt-6 flex justify-between text-sm font-bold">
          <span>{application.applicationNo}</span>
          <span>Status: {label(application.status)}</span>
        </div>
        <h1 className="mt-10 text-center text-2xl font-black">
          {application.studentName}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Applying for {application.applyingClass.name}
          {application.preferredSection
            ? ` / ${application.preferredSection.name}`
            : ""}{" "}
          · {application.academicYear.name}
        </p>
        <Section title="Student details">
          <Grid
            rows={[
              ["Date of birth", application.dob.toLocaleDateString("en-IN")],
              ["Gender", label(application.gender)],
              ["Aadhaar", show(application.studentAadhar)],
              ["APAAR ID", show(application.apaarId)],
              ["Previous school", show(application.previousSchool)],
              [
                "Transport required",
                application.transportRequired ? "Yes" : "No",
              ],
            ]}
          />
        </Section>
        <Section title="Parents & guardian">
          <Grid
            rows={[
              ["Father", show(application.fatherName)],
              ["Father mobile", show(application.fatherPhone)],
              ["Mother", show(application.motherName)],
              ["Mother mobile", show(application.motherPhone)],
              ["Guardian", show(application.guardianName)],
              ["Guardian mobile", show(application.guardianPhone)],
              ["Relationship", show(application.guardianRelation)],
              ["Email", show(application.email)],
            ]}
          />
        </Section>
        <Section title="Address & health">
          <Grid
            rows={[
              ["Address", show(application.address)],
              ["City", show(application.city)],
              ["District", show(application.district)],
              ["State", show(application.state)],
              ["PIN code", show(application.pincode)],
              ["Medical conditions", show(application.medicalConditions)],
            ]}
          />
        </Section>
        <Section title="Documents received">
          {application.documents.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {application.documents.map((document) => (
                <li key={document.id} className="text-sm">
                  ✓ {label(document.type)} — {document.originalName}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No documents uploaded.</p>
          )}
        </Section>
        <footer className="mt-16 grid grid-cols-2 gap-20 text-center text-xs font-bold">
          <div className="border-t pt-2">Parent / Guardian signature</div>
          <div className="border-t pt-2">Admissions office</div>
        </footer>
        <p className="mt-12 text-center text-[10px] text-slate-400">
          Generated from SchoolDB on {new Date().toLocaleString("en-IN")}
        </p>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9">
      <h2 className="border-b pb-2 text-sm font-black tracking-wider uppercase">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function Grid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map(([name, value]) => (
        <div key={name}>
          <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
            {name}
          </p>
          <p className="mt-1 text-sm font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}

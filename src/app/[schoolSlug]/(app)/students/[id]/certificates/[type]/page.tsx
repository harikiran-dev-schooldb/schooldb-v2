import { notFound } from "next/navigation";

import { PrintDocumentButton } from "@/features/students/components/profile/PrintDocumentButton";
import { requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ schoolSlug: string; id: string; type: string }> };
const validTypes = new Set(["id-card", "bonafide", "study", "transfer"]);

function dateLabel(value: Date | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(value)
    : "—";
}

export default async function StudentCertificatePage({ params }: Props) {
  const { schoolSlug, id, type } = await params;
  if (!validTypes.has(type)) notFound();
  const tenant = await requireTenant(schoolSlug);
  const student = await prisma.student.findFirst({
    where: { id, schoolId: tenant.schoolId },
    select: {
      admissionNo: true,
      fullName: true,
      dob: true,
      joinedDate: true,
      imageUrl: true,
      fatherName: true,
      motherName: true,
      address: true,
      status: true,
      statusChangedAt: true,
      statusRemarks: true,
      school: { select: { name: true } },
      enrollments: {
        orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
        take: 1,
        select: {
          rollNo: true,
          academicYear: { select: { name: true } },
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
    },
  });
  if (!student || (type === "transfer" && student.status !== "TC_ISSUED")) notFound();

  const enrollment = student.enrollments[0];
  const studentName = student.fullName || "Student";
  const className = enrollment ? `${enrollment.class.name} – ${enrollment.section.name}` : "—";
  const certificateNo = `SDB/${new Date().getFullYear()}/${student.admissionNo}`;

  if (type === "id-card") {
    return (
      <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
        <div className="mx-auto mb-5 flex max-w-2xl justify-end"><PrintDocumentButton /></div>
        <main className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-2 print:grid-cols-2">
          <section className="overflow-hidden rounded-3xl border bg-white shadow-xl print:shadow-none">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-5 text-center text-white">
              <p className="text-lg font-black tracking-tight">{student.school.name}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white/75">Student identity card</p>
            </div>
            <div className="p-6 text-center">
              <div
                className="mx-auto flex size-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-indigo-100 bg-slate-100 bg-cover bg-center text-3xl font-black text-indigo-600"
                style={student.imageUrl ? { backgroundImage: `url(${JSON.stringify(student.imageUrl)})` } : undefined}
                role={student.imageUrl ? "img" : undefined}
                aria-label={student.imageUrl ? studentName : undefined}
              >
                {!student.imageUrl && studentName.charAt(0)}
              </div>
              <h1 className="mt-4 text-xl font-black">{studentName}</h1>
              <p className="mt-1 text-sm font-semibold text-indigo-600">{className}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-left text-xs">
                <div><dt className="text-slate-500">Admission no.</dt><dd className="mt-1 font-bold">{student.admissionNo}</dd></div>
                <div><dt className="text-slate-500">Roll no.</dt><dd className="mt-1 font-bold">{enrollment?.rollNo ?? "—"}</dd></div>
                <div><dt className="text-slate-500">Date of birth</dt><dd className="mt-1 font-bold">{dateLabel(student.dob)}</dd></div>
                <div><dt className="text-slate-500">Academic year</dt><dd className="mt-1 font-bold">{enrollment?.academicYear.name ?? "—"}</dd></div>
              </dl>
            </div>
          </section>
          <section className="flex min-h-[460px] flex-col rounded-3xl border bg-white p-6 shadow-xl print:shadow-none">
            <h2 className="text-center text-sm font-black uppercase tracking-wider text-indigo-600">Student information</h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div><dt className="text-xs text-slate-500">Parent / guardian</dt><dd className="mt-1 font-semibold">{student.fatherName || student.motherName || "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Address</dt><dd className="mt-1 font-semibold leading-6">{student.address || "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Valid academic year</dt><dd className="mt-1 font-semibold">{enrollment?.academicYear.name ?? "—"}</dd></div>
            </dl>
            <div className="mt-auto border-t pt-5 text-center"><div className="mx-auto mb-2 h-px w-32 bg-slate-400" /><p className="text-xs font-semibold">Authorised signature</p><p className="mt-5 text-[10px] text-slate-400">If found, please return this card to the school office.</p></div>
          </section>
        </main>
      </div>
    );
  }

  const title = type === "bonafide" ? "Bonafide Certificate" : type === "study" ? "Study Certificate" : "Transfer Certificate";
  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-5 flex max-w-4xl justify-end"><PrintDocumentButton /></div>
      <main className="mx-auto min-h-[1050px] max-w-4xl border-[10px] border-double border-slate-900 bg-white px-16 py-14 text-slate-950 shadow-2xl print:min-h-screen print:shadow-none">
        <header className="border-b-2 border-slate-900 pb-8 text-center"><p className="text-3xl font-black uppercase tracking-tight">{student.school.name}</p><p className="mt-2 text-xs font-bold uppercase tracking-[0.35em] text-slate-500">SchoolDB · Official record</p></header>
        <div className="mt-6 flex justify-between text-xs font-semibold"><span>Certificate No: {certificateNo}</span><span>Date: {dateLabel(new Date())}</span></div>
        <h1 className="mt-16 text-center text-2xl font-black uppercase tracking-[0.18em] underline decoration-2 underline-offset-8">{title}</h1>
        {type === "transfer" ? (
          <div className="mt-14 space-y-5 text-base leading-8">
            <p>This is to certify that <strong>{studentName}</strong>, Admission No. <strong>{student.admissionNo}</strong>, was a student of this school.</p>
            <dl className="grid grid-cols-[220px_1fr] gap-y-4 border-y py-6"><dt>Date of birth</dt><dd className="font-semibold">{dateLabel(student.dob)}</dd><dt>Last class attended</dt><dd className="font-semibold">{className}</dd><dt>Date of admission</dt><dd className="font-semibold">{dateLabel(student.joinedDate)}</dd><dt>Date of leaving</dt><dd className="font-semibold">{dateLabel(student.statusChangedAt)}</dd><dt>Reason / remarks</dt><dd className="font-semibold">{student.statusRemarks || "Transfer certificate issued"}</dd></dl>
            <p>The student has been removed from the active rolls of the school. We wish them success in their future studies.</p>
          </div>
        ) : (
          <div className="mt-16 text-lg leading-10"><p>This is to certify that <strong>{studentName}</strong>, child of <strong>{student.fatherName || student.motherName || "the recorded parent/guardian"}</strong>, bearing Admission No. <strong>{student.admissionNo}</strong>, is a bonafide student of <strong>{student.school.name}</strong>.</p><p className="mt-8">The student is studying in <strong>{className}</strong> during the academic year <strong>{enrollment?.academicYear.name ?? "current academic year"}</strong>. Date of birth as recorded in the school register is <strong>{dateLabel(student.dob)}</strong>.</p><p className="mt-8">This certificate is issued upon request for official purposes.</p></div>
        )}
        <footer className="mt-40 grid grid-cols-2 gap-20 text-center text-sm font-semibold"><div><div className="mb-3 border-t border-slate-900" />Class Teacher</div><div><div className="mb-3 border-t border-slate-900" />Principal / Head of School</div></footer>
      </main>
    </div>
  );
}

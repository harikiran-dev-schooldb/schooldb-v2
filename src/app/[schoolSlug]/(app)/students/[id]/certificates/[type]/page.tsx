import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEFAULT_CERTIFICATE_SETTING, renderCertificateContent } from "@/features/students/certificate-settings";
import { CertificateIssueActions } from "@/features/students/components/certificates/CertificateIssueActions";
import { PrintDocumentButton } from "@/features/students/components/profile/PrintDocumentButton";
import { StudentIdCard } from "@/features/students/components/id-cards/StudentIdCard";
import { requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ schoolSlug: string; id: string; type: string }>; searchParams: Promise<{ issueId?: string }> };
const validTypes = new Set(["id-card", "bonafide", "study", "transfer"]);

function dateLabel(value: Date | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(value)
    : "—";
}

export default async function StudentCertificatePage({ params, searchParams }: Props) {
  const [{ schoolSlug, id, type }, filters] = await Promise.all([params, searchParams]);
  if (!validTypes.has(type)) notFound();
  const tenant = await requireTenant(schoolSlug);
  const issueType = type === "bonafide" ? "BONAFIDE" : type === "study" ? "STUDY" : type === "transfer" ? "TRANSFER" : null;
  const [student, issue] = await Promise.all([prisma.student.findFirst({
    where: { id, schoolId: tenant.schoolId },
    select: {
      admissionNo: true,
      fullName: true,
      dob: true,
      joinedDate: true,
      imageUrl: true,
      fatherName: true,
      motherName: true,
      guardianName: true,
      guardianPhone: true,
      fatherPhone: true,
      motherPhone: true,
      alternatePhone: true,
      phone: true,
      address: true,
      bloodGroup: true,
      status: true,
      statusChangedAt: true,
      statusRemarks: true,
      parentLinks: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { parentUser: { select: { firstName: true, lastName: true } } },
      },
      school: {
        select: {
          name: true,
          logo: true,
          idCardSetting: {
            select: { orientation: true, widthMm: true, heightMm: true, showBack: true, backImageUrl: true, backContent: true },
          },
          certificateSetting: {
            select: { headerSubtitle: true, bonafideContent: true, studyContent: true, transferContent: true, footerNote: true, signatoryLabel: true },
          },
        },
      },
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
  }), filters.issueId && issueType ? prisma.certificateIssue.findFirst({ where: { id: filters.issueId, schoolId: tenant.schoolId, studentId: id, type: issueType }, select: { id: true, certificateNo: true, status: true, issuedAt: true } }) : Promise.resolve(null)]);
  if (!student || (type === "transfer" && student.status !== "TC_ISSUED")) notFound();

  const enrollment = student.enrollments[0];
  const studentName = student.fullName || "Student";
  const className = enrollment ? `${enrollment.class.name} – ${enrollment.section.name}` : "—";
  const certificateNo = issue?.certificateNo ?? "DRAFT — NOT YET ISSUED";
  const studentHref = `/${schoolSlug}/students/${id}`;

  if (type === "id-card") {
    return (
      <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
        <div className="mx-auto mb-5 flex max-w-2xl items-center justify-between print:hidden">
          <Button asChild variant="outline"><Link href={studentHref}><ArrowLeft className="size-4" /> Back to student</Link></Button>
          <PrintDocumentButton />
        </div>
        <main className="id-card-print mx-auto max-w-2xl">
          <StudentIdCard
            school={student.school}
            setting={student.school.idCardSetting ? {
              orientation: student.school.idCardSetting.orientation,
              widthMm: Number(student.school.idCardSetting.widthMm),
              heightMm: Number(student.school.idCardSetting.heightMm),
              showBack: student.school.idCardSetting.showBack,
              backImageUrl: student.school.idCardSetting.backImageUrl,
              backContent: student.school.idCardSetting.backContent,
            } : undefined}
            student={{
              admissionNo: student.admissionNo,
              fullName: student.fullName,
              imageUrl: student.imageUrl,
              fatherName: student.fatherName,
              motherName: student.motherName,
              guardianName: student.guardianName,
              guardianPhone: student.guardianPhone,
              fatherPhone: student.fatherPhone,
              motherPhone: student.motherPhone,
              alternatePhone: student.alternatePhone,
              phone: student.phone,
              address: student.address,
              bloodGroup: student.bloodGroup,
              enrollment: enrollment ? {
                academicYear: enrollment.academicYear.name,
                className: enrollment.class.name,
                sectionName: enrollment.section.name,
                rollNo: enrollment.rollNo,
              } : null,
            }}
          />
        </main>
      </div>
    );
  }

  const title = type === "bonafide" ? "Bonafide Certificate" : type === "study" ? "Study Certificate" : "Transfer Certificate";
  const linkedParentName = [student.parentLinks[0]?.parentUser.firstName, student.parentLinks[0]?.parentUser.lastName].filter(Boolean).join(" ");
  const parentName = student.guardianName || student.fatherName || student.motherName || linkedParentName || "Not provided";
  const setting = student.school.certificateSetting ?? DEFAULT_CERTIFICATE_SETTING;
  const template = type === "bonafide" ? setting.bonafideContent : type === "study" ? setting.studyContent : setting.transferContent;
  const certificateContent = renderCertificateContent(template, {
    studentName,
    parentName,
    admissionNo: student.admissionNo,
    schoolName: student.school.name,
    className,
    academicYear: enrollment?.academicYear.name ?? "current academic year",
    dateOfBirth: dateLabel(student.dob),
    joinedDate: dateLabel(student.joinedDate),
    leavingDate: dateLabel(student.statusChangedAt),
    remarks: student.statusRemarks || "Transfer certificate issued",
  });

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-5 flex max-w-4xl items-center justify-between print:hidden">
        <Button asChild variant="outline"><Link href={studentHref}><ArrowLeft className="size-4" /> Back to student</Link></Button>
        {issueType ? <CertificateIssueActions studentId={id} type={issueType} issueId={issue?.id} cancelled={issue?.status === "CANCELLED"} /> : null}
      </div>
      <main className="certificate-print mx-auto min-h-[1050px] max-w-4xl border-[10px] border-double border-slate-900 bg-white px-16 py-14 text-slate-950 shadow-2xl print:min-h-screen print:shadow-none">
        <header className="border-b-2 border-slate-900 pb-8 text-center"><p className="text-3xl font-black uppercase tracking-tight">{student.school.name}</p><p className="mt-2 text-xs font-bold uppercase tracking-[0.35em] text-slate-500">{setting.headerSubtitle}</p></header>
        <div className="mt-6 flex justify-between text-xs font-semibold"><span>Certificate No: {certificateNo}</span><span>Date: {dateLabel(issue?.issuedAt ?? new Date())}</span></div>
        <h1 className="mt-16 text-center text-2xl font-black uppercase tracking-[0.18em] underline decoration-2 underline-offset-8">{title}</h1>
        <div className="mt-16 whitespace-pre-line text-lg leading-10">{certificateContent}</div>
        <footer className="mt-36">
          {setting.footerNote ? <p className="mb-20 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">{setting.footerNote}</p> : null}
          <div className="ml-auto w-64 text-center text-sm font-semibold"><div className="mb-3 border-t border-slate-900" />{setting.signatoryLabel}</div>
        </footer>
      </main>
    </div>
  );
}

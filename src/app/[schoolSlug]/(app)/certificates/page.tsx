import Link from "next/link";
import {
  Download,
  FileBadge2,
  Printer,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelCertificateButton } from "@/features/students/components/certificates/CancelCertificateButton";
import { CertificateRegisterFilters } from "@/features/students/components/certificates/CertificateRegisterFilters";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    classId?: string;
    sectionId?: string;
  }>;
};
const typeLabel = { BONAFIDE: "Bonafide", STUDY: "Study", TRANSFER: "Transfer" } as const;
const typeSlug = { BONAFIDE: "bonafide", STUDY: "study", TRANSFER: "transfer" } as const;

export default async function CertificateRegisterPage({ params, searchParams }: Props) {
  const [{ schoolSlug }, filters] = await Promise.all([params, searchParams]);
  const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const q = filters.q?.trim() || "";
  const status = filters.status === "CANCELLED" ? "CANCELLED" : filters.status === "ISSUED" ? "ISSUED" : undefined;
  const type = ["BONAFIDE", "STUDY", "TRANSFER"].includes(filters.type || "") ? filters.type as "BONAFIDE" | "STUDY" | "TRANSFER" : undefined;
  const classId = filters.classId || "";
  const sectionId = filters.sectionId || "";
  const where: Prisma.CertificateIssueWhereInput = {
    schoolId: tenant.schoolId,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...((classId || sectionId) && {
      student: {
        enrollments: {
          some: {
            active: true,
            ...(classId && { classId }),
            ...(sectionId && { sectionId }),
          },
        },
      },
    }),
    ...(q
      ? {
          OR: [
            { certificateNo: { contains: q, mode: "insensitive" } },
            { student: { fullName: { contains: q, mode: "insensitive" } } },
            { student: { admissionNo: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [issues, total, active, cancelled] = await Promise.all([
    prisma.certificateIssue.findMany({ where, orderBy: { issuedAt: "desc" }, take: 100, select: { id: true, certificateNo: true, type: true, status: true, purpose: true, issuedAt: true, issuedByName: true, printCount: true, cancellationNote: true, student: { select: { id: true, fullName: true, admissionNo: true } } } }),
    prisma.certificateIssue.count({ where: { schoolId: tenant.schoolId } }),
    prisma.certificateIssue.count({ where: { schoolId: tenant.schoolId, status: "ISSUED" } }),
    prisma.certificateIssue.count({ where: { schoolId: tenant.schoolId, status: "CANCELLED" } }),
  ]);

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (status) exportParams.set("status", status);
  if (type) exportParams.set("type", type);
  if (classId) exportParams.set("classId", classId);
  if (sectionId) exportParams.set("sectionId", sectionId);

  return <PageContainer><PageHeader title="Certificate Issue Register" description="A permanent audit trail for every official certificate issued by the school." actions={<Button asChild variant="outline"><a href={`/api/v1/certificate-issues/export?${exportParams}`}><Download className="size-4" /> Export CSV</a></Button>} />
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-[0_28px_70px_rgba(30,27,75,0.25)] sm:p-8"><div className="absolute -right-16 -top-20 size-64 rounded-full bg-cyan-400/10 blur-3xl" /><div className="relative grid gap-4 sm:grid-cols-3"><Stat icon={FileBadge2} label="All issued records" value={total} /><Stat icon={ShieldCheck} label="Active certificates" value={active} /><Stat icon={XCircle} label="Cancelled records" value={cancelled} /></div></section>
    <CertificateRegisterFilters initialQuery={q} initialType={type || ""} initialStatus={status || ""} initialClassId={classId} initialSectionId={sectionId} />
    <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-bold">Recent issues <span className="text-sm font-normal text-muted-foreground">(latest 100)</span></h2></div>{issues.length ? <div className="divide-y">{issues.map((issue) => <article key={issue.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant={issue.status === "ISSUED" ? "success" : "outline"}>{issue.status}</Badge><Badge variant="outline">{typeLabel[issue.type]}</Badge><span className="font-mono text-xs text-muted-foreground">{issue.certificateNo}</span></div><h3 className="mt-2 font-bold">{issue.student.fullName || "Student"} <span className="font-normal text-muted-foreground">({issue.student.admissionNo})</span></h3><p className="mt-1 text-xs text-muted-foreground">Issued {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(issue.issuedAt)} by {issue.issuedByName} · {issue.printCount} print{issue.printCount === 1 ? "" : "s"}</p>{issue.purpose ? <p className="mt-2 text-sm text-muted-foreground">Purpose: {issue.purpose}</p> : null}{issue.cancellationNote ? <p className="mt-2 text-sm text-destructive">Cancelled: {issue.cancellationNote}</p> : null}</div><div className="flex shrink-0 gap-2">{issue.status === "ISSUED" ? <><Button asChild size="sm" variant="outline"><Link href={`/${schoolSlug}/students/${issue.student.id}/certificates/${typeSlug[issue.type]}?issueId=${issue.id}`}><Printer className="size-3.5" /> Open / reprint</Link></Button><CancelCertificateButton id={issue.id} certificateNo={issue.certificateNo} /></> : null}</div></article>)}</div> : <div className="p-12 text-center"><FileBadge2 className="mx-auto size-9 text-muted-foreground" /><p className="mt-3 font-semibold">No certificate records found</p><p className="mt-1 text-sm text-muted-foreground">Issue a certificate from a student’s Documents tab.</p></div>}</section>
  </PageContainer>;
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><Icon className="size-5 text-cyan-300" /><p className="mt-3 text-3xl font-black">{value}</p><p className="text-xs text-indigo-100/80">{label}</p></div>;
}

import { FileBadge2 } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { CertificateSettingsForm } from "@/features/students/components/certificates/CertificateSettingsForm";
import { DEFAULT_CERTIFICATE_SETTING } from "@/features/students/certificate-settings";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ schoolSlug: string }> };

export default async function CertificateSettingsPage({ params }: Props) {
  const { schoolSlug } = await params;
  const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const setting = await prisma.schoolCertificateSetting.findUnique({
    where: { schoolId: tenant.schoolId },
    select: { headerSubtitle: true, bonafideContent: true, studyContent: true, transferContent: true, footerNote: true, signatoryLabel: true },
  });

  return (
    <div className="space-y-6 p-4 pb-12 sm:p-6">
      <PageHeader eyebrow="School Setup" title="Certificate Settings" description="Customize the official wording and signatory shown on student certificates." />
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/60 px-6 py-7 shadow-[0_16px_45px_rgba(15,23,42,0.06)] md:px-8">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative flex items-center gap-4"><div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"><FileBadge2 className="size-6 text-indigo-600" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Official Documents</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Your school’s wording</h2><p className="mt-1 text-sm text-slate-500">Saved once and applied automatically to newly generated certificates.</p></div></div>
      </section>
      <CertificateSettingsForm initialValue={setting ?? { ...DEFAULT_CERTIFICATE_SETTING }} />
    </div>
  );
}

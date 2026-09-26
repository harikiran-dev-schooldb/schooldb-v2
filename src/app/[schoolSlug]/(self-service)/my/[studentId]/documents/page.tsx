import { Download, FileText, ShieldCheck } from "lucide-react";

import { SelfServiceEmptyState, SelfServicePage } from "@/components/self-service/SelfServicePage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireStudentAccess } from "@/lib/student-access";

function bytesLabel(value: number) {
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function StudentDocumentsPage({ params }: { params: Promise<{ schoolSlug: string; studentId: string }> }) {
  const { schoolSlug, studentId } = await params;
  const { membership } = await requireStudentAccess(schoolSlug, studentId);
  const documents = await prisma.studentDocument.findMany({
    where: { schoolId: membership.schoolId, studentId, visibleToFamily: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, originalName: true, mimeType: true, sizeBytes: true, notes: true, createdAt: true },
  });

  return (
    <SelfServicePage title="Documents" description="Secure school documents shared with this student and linked parents.">
      <div className="relative overflow-hidden rounded-[28px] border border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/80 to-violet-100/70 p-6 text-slate-950 shadow-[0_24px_60px_rgba(79,70,229,0.1)]">
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-indigo-300/25 blur-3xl" /><ShieldCheck className="relative size-7 text-indigo-600" /><h3 className="relative mt-3 text-2xl font-bold">Private document vault</h3><p className="relative mt-2 text-sm text-slate-600">Only documents approved by the school for family access appear here.</p>
      </div>
      {documents.length ? <div className="grid gap-4 md:grid-cols-2">{documents.map((document) => <Card key={document.id} className="rounded-[24px] border-border/60 bg-card/90 shadow-[0_16px_42px_rgba(15,23,42,0.05)]"><CardContent className="p-5"><div className="flex gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><FileText className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold">{document.name}</h3><Badge variant="success">School shared</Badge></div><p className="mt-1 text-xs text-muted-foreground">{bytesLabel(document.sizeBytes)} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(document.createdAt)}</p>{document.notes && <p className="mt-3 text-sm leading-6 text-muted-foreground">{document.notes}</p>}</div></div><Button asChild variant="outline" className="mt-5 w-full"><a href={`/api/v1/students/${studentId}/documents/${document.id}/download`} target="_blank" rel="noreferrer"><Download className="size-4" /> Open document</a></Button></CardContent></Card>)}</div> : <Card><CardContent className="p-0"><SelfServiceEmptyState icon={FileText} title="No documents shared" description="Documents approved by the school will appear here." className="min-h-56" /></CardContent></Card>}
    </SelfServicePage>
  );
}

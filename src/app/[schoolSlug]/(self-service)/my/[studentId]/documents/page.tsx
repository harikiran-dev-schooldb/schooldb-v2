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
      <div className="rounded-[28px] bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 p-6 text-white shadow-[0_24px_60px_rgba(79,70,229,0.2)]">
        <ShieldCheck className="size-7" /><h3 className="mt-3 text-2xl font-bold">Private document vault</h3><p className="mt-2 text-sm text-indigo-100">Only documents approved by the school for family access appear here.</p>
      </div>
      {documents.length ? <div className="grid gap-4 md:grid-cols-2">{documents.map((document) => <Card key={document.id} className="border-white/80 bg-white/90 shadow-[0_16px_42px_rgba(15,23,42,0.05)]"><CardContent className="p-5"><div className="flex gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><FileText className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold">{document.name}</h3><Badge variant="success">School shared</Badge></div><p className="mt-1 text-xs text-muted-foreground">{bytesLabel(document.sizeBytes)} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(document.createdAt)}</p>{document.notes && <p className="mt-3 text-sm leading-6 text-muted-foreground">{document.notes}</p>}</div></div><Button asChild variant="outline" className="mt-5 w-full"><a href={`/api/v1/students/${studentId}/documents/${document.id}/download`} target="_blank" rel="noreferrer"><Download className="size-4" /> Open document</a></Button></CardContent></Card>)}</div> : <Card><CardContent className="p-0"><SelfServiceEmptyState icon={FileText} title="No documents shared" description="Documents approved by the school will appear here." className="min-h-56" /></CardContent></Card>}
    </SelfServicePage>
  );
}

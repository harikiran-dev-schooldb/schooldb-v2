"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AdmissionSelect } from "./AdmissionWorkspaceUI";
import { refreshTable } from "@/lib/table-event";

type Status = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "WAITLISTED" | "REJECTED" | "CONVERTED" | "DRAFT";

export function AdmissionReviewActions({ id, status, sections, automaticNumbering, nextAdmissionNo, feePlans=[], admin=false, docsReady=true, ageException=false }: { id: string; status: Status; sections: { id: string; name: string }[]; automaticNumbering: boolean; nextAdmissionNo: string; feePlans?:{id:string;name:string}[]; admin?:boolean; docsReady?:boolean; ageException?:boolean }) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<"UNDER_REVIEW" | "APPROVED" | "WAITLISTED" | "REJECTED">(status === "SUBMITTED" ? "UNDER_REVIEW" : "APPROVED");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [admissionNo, setAdmissionNo] = useState(automaticNumbering ? nextAdmissionNo : "");
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const [rollNo, setRollNo] = useState("");
  const [feePlanId,setFeePlanId]=useState("");
  const [isRte,setIsRte]=useState(false);

  async function request(url: string, method: string, body: object) {
    setBusy(true);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Unable to update the application.");
      toast.success(result.message);
      refreshTable("admissions", "students", "enrollments");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update the application.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "CONVERTED") return <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4" />Student profile created</div>;

  if (status === "APPROVED" && !admin) return <p className="text-sm text-muted-foreground">An administrator must create the enrollment.</p>;
  if (status === "APPROVED") return <div className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
    <div><p className="font-bold text-foreground">Create student & enrollment</p><p className="text-xs text-emerald-700 dark:text-emerald-300">The application is approved. Assign the final admission number and section.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="space-y-1"><Label>Admission no.</Label><Input value={admissionNo} disabled={automaticNumbering} onChange={(event) => setAdmissionNo(event.target.value.toUpperCase())} placeholder="e.g. 14571" />{automaticNumbering && <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Generated automatically when saved.</p>}</div><div className="space-y-1"><Label>Section</Label><Select value={sectionId} onValueChange={setSectionId}><SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger><SelectContent>{sections.map((section) => <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Roll no. (optional)</Label><Input value={rollNo} onChange={(event) => setRollNo(event.target.value.replace(/\D/g, ""))} inputMode="numeric" /></div></div>
    <label className="block space-y-1 text-sm font-medium">ERP fee plan (optional)<AdmissionSelect label="ERP fee plan" options={[{id:"",name:"Do not assign fees yet"},...feePlans]} value={feePlanId} onChange={setFeePlanId}/></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={isRte} onChange={e=>setIsRte(e.target.checked)}/>Confirmed RTE student (fee waiver)</label><p className="text-xs text-muted-foreground">Selecting a fee plan creates unpaid installments in the ERP when enrolling. No payment is recorded.</p>
    <Button disabled={busy || !admissionNo || !sectionId || !docsReady} onClick={() => request(`/api/v1/admissions/${id}/convert`, "POST", { admissionNo, sectionId, rollNo, ...(feePlanId?{feePlanId}:{}), isRte })} className="w-full bg-emerald-600 hover:bg-emerald-700">{busy ? <LoaderCircle className="animate-spin" /> : <UserPlus />}Create student account</Button>
    <Button variant="ghost" size="sm" disabled={busy} onClick={() => request(`/api/v1/admissions/${id}`, "PATCH", { status: "UNDER_REVIEW", note: "Returned for further review." })}>Return to review</Button>
  </div>;

  return <div className="space-y-3 rounded-2xl border bg-muted/30 p-4">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_2fr]"><Select value={nextStatus} onValueChange={(value) => setNextStatus(value as typeof nextStatus)}><SelectTrigger className="bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UNDER_REVIEW">Under review</SelectItem><SelectItem value="APPROVED" disabled={ageException&&!admin}>Approve</SelectItem><SelectItem value="WAITLISTED">Waitlist</SelectItem><SelectItem value="REJECTED">Reject</SelectItem></SelectContent></Select><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Review note (optional)" className="min-h-10 bg-card" /></div>
    <Button disabled={busy || (nextStatus==="APPROVED"&&(!docsReady||(ageException&&!admin)))} onClick={() => request(`/api/v1/admissions/${id}`, "PATCH", { status: nextStatus, note })}>{busy && <LoaderCircle className="animate-spin" />}Update application</Button>
  </div>;
}

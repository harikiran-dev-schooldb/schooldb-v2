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

type Status = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "WAITLISTED" | "REJECTED" | "CONVERTED" | "DRAFT";

export function AdmissionReviewActions({ id, status, sections, automaticNumbering, nextAdmissionNo }: { id: string; status: Status; sections: { id: string; name: string }[]; automaticNumbering: boolean; nextAdmissionNo: string }) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<"UNDER_REVIEW" | "APPROVED" | "WAITLISTED" | "REJECTED">(status === "SUBMITTED" ? "UNDER_REVIEW" : "APPROVED");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [admissionNo, setAdmissionNo] = useState(automaticNumbering ? nextAdmissionNo : "");
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const [rollNo, setRollNo] = useState("");

  async function request(url: string, method: string, body: object) {
    setBusy(true);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Unable to update the application.");
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update the application.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "CONVERTED") return <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"><CheckCircle2 className="size-4" />Student profile created</div>;

  if (status === "APPROVED") return <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
    <div><p className="font-bold text-emerald-950">Create student & enrollment</p><p className="text-xs text-emerald-700">The application is approved. Assign the final admission number and section.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="space-y-1"><Label>Admission no.</Label><Input value={admissionNo} disabled={automaticNumbering} onChange={(event) => setAdmissionNo(event.target.value.toUpperCase())} placeholder="e.g. 14571" />{automaticNumbering && <p className="text-[11px] text-emerald-700">Generated automatically when saved.</p>}</div><div className="space-y-1"><Label>Section</Label><Select value={sectionId} onValueChange={setSectionId}><SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger><SelectContent>{sections.map((section) => <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Roll no. (optional)</Label><Input value={rollNo} onChange={(event) => setRollNo(event.target.value.replace(/\D/g, ""))} inputMode="numeric" /></div></div>
    <Button disabled={busy || !admissionNo || !sectionId} onClick={() => request(`/api/v1/admissions/${id}/convert`, "POST", { admissionNo, sectionId, rollNo })} className="w-full bg-emerald-600 hover:bg-emerald-700">{busy ? <LoaderCircle className="animate-spin" /> : <UserPlus />}Create student account</Button>
    <Button variant="ghost" size="sm" disabled={busy} onClick={() => request(`/api/v1/admissions/${id}`, "PATCH", { status: "UNDER_REVIEW", note: "Returned for further review." })}>Return to review</Button>
  </div>;

  return <div className="space-y-3 rounded-2xl border bg-slate-50 p-4">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_2fr]"><Select value={nextStatus} onValueChange={(value) => setNextStatus(value as typeof nextStatus)}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UNDER_REVIEW">Under review</SelectItem><SelectItem value="APPROVED">Approve</SelectItem><SelectItem value="WAITLISTED">Waitlist</SelectItem><SelectItem value="REJECTED">Reject</SelectItem></SelectContent></Select><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Review note (optional)" className="min-h-10 bg-white" /></div>
    <Button disabled={busy} onClick={() => request(`/api/v1/admissions/${id}`, "PATCH", { status: nextStatus, note })}>{busy && <LoaderCircle className="animate-spin" />}Update application</Button>
  </div>;
}

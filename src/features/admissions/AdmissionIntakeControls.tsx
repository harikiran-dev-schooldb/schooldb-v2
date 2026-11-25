"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewStages, followUpOutcomes, type ReviewStage } from "./intake-policy";
import { AgeFeePreview, type AdmissionYearChoice } from "./AdmissionCalculator";
import { Plus, CalendarClock } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AdmissionSelect } from "./AdmissionWorkspaceUI";
type Choice = { id: string; name: string };
type Member = Choice & { contact: boolean };

function utc(value: FormDataEntryValue | null) {
  if (!value) return null;
  // School time is IST, regardless of browser timezone.
  return new Date(String(value) + ":00+05:30").toISOString();
}
function ist(value: string | null) {
  return value ? new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0,16) : "";
}
function useSave() {
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  async function save(path: string, method: string, body: object) {
    setBusy(true);
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to save.");
      toast.success(result.message || "Saved."); router.refresh(); return true;
    } catch(error) { toast.error(error instanceof Error ? error.message : "Unable to save."); return false; }
    finally { setBusy(false); }
  }
  return { busy, save };
}
export function EnquiryForm({ years, classes }: { years: AdmissionYearChoice[]; classes: Choice[] }) {
  const {busy,save} = useSave();
  const [yearId,setYearId]=useState(years[0]?.id??"");
  const [classId,setClassId]=useState(classes[0]?.id??"");
  const [dob,setDob]=useState("");
  const [open,setOpen]=useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const f = new FormData(form);
    if(await save("/api/v1/admissions/intake","POST",{...Object.fromEntries(f),dob:f.get("dob") || null})) { form.reset(); setDob(""); setOpen(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="h-11 rounded-xl px-5 font-semibold shadow-lg shadow-primary/20"><Plus/>New enquiry</Button></DialogTrigger><DialogContent className="max-h-[90dvh] max-w-3xl gap-0 overflow-y-auto rounded-3xl border-border/70 bg-card p-0"><DialogHeader className="border-b border-border/60 bg-muted/30 px-5 py-5 sm:px-8"><p className="section-label">Admissions</p><DialogTitle className="text-xl">New admission enquiry</DialogTitle><DialogDescription>Capture parent and student details, eligibility and fee information.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="grid gap-4 p-4 text-sm font-medium sm:grid-cols-2 sm:p-6">
      <label>Academic year<AdmissionSelect name="academicYearId" label="Academic year" options={years} value={yearId} onChange={setYearId}/></label>
      <label>Applying class<AdmissionSelect name="classId" label="Applying class" options={classes} value={classId} onChange={setClassId}/></label>
      <label>Student name<Input name="studentName" required minLength={2}/></label>
      <label>Parent / guardian name<Input name="parentName" required minLength={2}/></label>
      <label>Mobile<Input name="mobile" required pattern="[0-9]{10}" inputMode="tel"/></label>
      <label>DOB (optional)<Input name="dob" type="date" value={dob} onChange={e=>setDob(e.target.value)}/></label>
      <div className="sm:col-span-2"><AgeFeePreview dob={dob} year={years.find(y=>y.id===yearId)} classes={classes} classId={classId}/></div>
      <label>Source<AdmissionSelect name="source" label="Source" defaultValue="WALK_IN" options={["WALK_IN","PHONE","REFERRAL","OTHER"].map(x=>({id:x,name:x.replaceAll("_"," ")}))}/></label>
      <label>Notes<Input name="notes" maxLength={1000}/></label>
      <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy || !yearId || !classId}>Save enquiry</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
export function EnquiryActions({id}:{id:string}) {
  const {busy,save}=useSave(); const [number,setNumber]=useState("");
  return <div className="flex flex-wrap items-center gap-2">
    <Input aria-label="Matching application number" placeholder="Matching application number" value={number} onChange={e=>setNumber(e.target.value)} className="max-w-xs"/>
    <Button size="sm" disabled={busy || number.trim().length<6} onClick={()=>save("/api/v1/admissions/intake/"+id,"PATCH",{action:"LINK",applicationNo:number})}>Link application</Button>
    <Button size="sm" variant="outline" disabled={busy} onClick={()=>save("/api/v1/admissions/intake/"+id,"PATCH",{action:"CLOSE"})}>Close enquiry</Button>
  </div>;
}
export function StageEditor({id,stage,status,at,memberId,members,admin}:{id:string;stage:"ENTRANCE"|"INTERVIEW";status:ReviewStage;at:string|null;memberId:string|null;members:Member[];admin:boolean}) {
  const {busy,save}=useSave();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const f=new FormData(event.currentTarget);
    await save("/api/v1/admissions/"+id+"/stages","PATCH",{stage,status:f.get("status"),scheduledAt:utc(f.get("at")),assignedMemberId:f.get("member")||null});
  }
  return <form onSubmit={submit} className="grid gap-2 rounded-xl border bg-card p-3">
    <p className="font-bold text-sm">{stage==="ENTRANCE"?"Entrance examination":"Interview"}</p>
    <label className="text-xs">Status<AdmissionSelect name="status" label="Stage status" defaultValue={status} options={reviewStages.filter(x=>admin||x!=="NOT_REQUIRED"||status==="NOT_REQUIRED").map(x=>({id:x,name:x.replaceAll("_"," ")}))}/></label>
    <label className="text-xs">Schedule (IST)<Input type="datetime-local" name="at" defaultValue={ist(at)}/></label>
    <label className="text-xs">Assigned staff<AdmissionSelect name="member" label="Assigned staff" defaultValue={memberId||""} options={[{id:"",name:"Unassigned"},...members]}/></label>
    <Button size="sm" type="submit" disabled={busy}>Save stage</Button>
  </form>;
}
export function ContactTaskForm({target,id,members}:{target:"ENQUIRY"|"APPLICATION";id:string;members:Member[]}) {
  const {busy,save}=useSave(); const [open,setOpen]=useState(false); const [member,setMember]=useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget;const f=new FormData(form);
    if(await save("/api/v1/admissions/contact-tasks","POST",{action:"CREATE",target,targetId:id,assignedMemberId:f.get("member"),dueAt:utc(f.get("due")),note:f.get("note")})) {form.reset();setMember("");setOpen(false);}
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-xl"><CalendarClock/>Schedule follow-up</Button></DialogTrigger><DialogContent className="max-w-xl rounded-3xl border-border/70 bg-card"><DialogHeader><DialogTitle>Schedule parent follow-up</DialogTitle><DialogDescription>Assign a school staff member and due date.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs">Assigned staff<AdmissionSelect name="member" label="Assigned staff" options={members.filter(x=>x.contact)} value={member} onChange={setMember}/></label>
      <label className="text-xs">Due (IST)<Input name="due" type="datetime-local" required/></label>
      <label className="text-xs sm:col-span-2">Follow-up note<Input name="note" required maxLength={1000}/></label>
      <DialogFooter className="sm:col-span-2"><Button variant="outline" type="button" onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={busy||!member} type="submit">Schedule</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
export function CompleteTask({id}:{id:string}) {
  const {busy,save}=useSave();
  return <form className="flex flex-wrap gap-2" onSubmit={event=>{event.preventDefault();const f=new FormData(event.currentTarget);void save("/api/v1/admissions/contact-tasks","POST",{action:"COMPLETE",taskId:id,outcome:f.get("outcome"),completionNote:f.get("note")});}}>
    <div className="w-full sm:w-44"><AdmissionSelect name="outcome" label="Outcome" defaultValue={followUpOutcomes[0]} options={followUpOutcomes.map(x=>({id:x,name:x.replaceAll("_"," ")}))}/></div>
    <Input name="note" aria-label="Completion note" placeholder="Completion note" className="max-w-xs"/>
    <Button size="sm" disabled={busy}>Complete</Button>
  </form>;
}

export function EnquiryAdminAction({id,action}:{id:string;action:"ACCEPT"|"DISMISS"|"REOPEN"}) {
 const {busy,save}=useSave(); const [confirm,setConfirm]=useState(false);
 if(action==="DISMISS"&&confirm)return <div className="space-y-2 rounded-lg border p-2"><p className="text-xs">Dismiss and redact personal details? This cannot be restored.</p><div className="flex gap-2"><Button size="sm" variant="destructive" disabled={busy} onClick={()=>void save("/api/v1/admissions/intake/"+id,"PATCH",{action})}>Confirm dismissal</Button><Button size="sm" variant="outline" onClick={()=>setConfirm(false)}>Cancel</Button></div></div>;
 return <Button size="sm" variant={action==="DISMISS"?"outline":"default"} disabled={busy} onClick={()=>{if(action==="DISMISS"){setConfirm(true);return;}void save("/api/v1/admissions/intake/"+id,"PATCH",{action});}}>{action==="ACCEPT"?"Accept enquiry":action==="DISMISS"?"Dismiss & redact":"Restore closed enquiry"}</Button>;
}

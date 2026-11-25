"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewStages, followUpOutcomes, type ReviewStage } from "./intake-policy";
import { AgeFeePreview, type AdmissionYearChoice } from "./AdmissionCalculator";
type Choice = { id: string; name: string };
type Member = Choice & { contact: boolean };
const selectStyle = "w-full rounded-md border bg-background px-2 py-2 text-sm";
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const f = new FormData(form);
    if(await save("/api/v1/admissions/intake","POST",{...Object.fromEntries(f),dob:f.get("dob") || null})) { form.reset(); setDob(""); }
  }
  return <details className="rounded-2xl border bg-card p-4">
    <summary className="cursor-pointer font-bold">New admission enquiry</summary>
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label>Academic year<select name="academicYearId" value={yearId} onChange={e=>setYearId(e.target.value)} required className={selectStyle}>{years.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Applying class<select name="classId" value={classId} onChange={e=>setClassId(e.target.value)} required className={selectStyle}>{classes.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Student name<Input name="studentName" required minLength={2}/></label>
      <label>Parent / guardian name<Input name="parentName" required minLength={2}/></label>
      <label>Mobile<Input name="mobile" required pattern="[0-9]{10}" inputMode="tel"/></label>
      <label>DOB (optional)<Input name="dob" type="date" value={dob} onChange={e=>setDob(e.target.value)}/></label>
      <div className="sm:col-span-2"><AgeFeePreview dob={dob} year={years.find(y=>y.id===yearId)} classes={classes} classId={classId}/></div>
      <label>Source<select name="source" className={selectStyle}>{["WALK_IN","PHONE","REFERRAL","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Notes<Input name="notes" maxLength={1000}/></label>
      <Button type="submit" disabled={busy || !years.length || !classes.length}>Save enquiry</Button>
    </form>
  </details>;
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
    <label className="text-xs">Status<select name="status" defaultValue={status} className={selectStyle}>{reviewStages.filter(x=>admin||x!=="NOT_REQUIRED"||status==="NOT_REQUIRED").map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="text-xs">Schedule (IST)<Input type="datetime-local" name="at" defaultValue={ist(at)}/></label>
    <label className="text-xs">Assigned staff<select name="member" className={selectStyle} defaultValue={memberId||""}><option value="">Unassigned</option>{members.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <Button size="sm" type="submit" disabled={busy}>Save stage</Button>
  </form>;
}
export function ContactTaskForm({target,id,members}:{target:"ENQUIRY"|"APPLICATION";id:string;members:Member[]}) {
  const {busy,save}=useSave();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget;const f=new FormData(form);
    if(await save("/api/v1/admissions/contact-tasks","POST",{action:"CREATE",target,targetId:id,assignedMemberId:f.get("member"),dueAt:utc(f.get("due")),note:f.get("note")})) form.reset();
  }
  return <details className="rounded-xl border bg-card p-3"><summary className="cursor-pointer text-sm font-bold">Schedule parent follow-up</summary>
    <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-2">
      <label className="text-xs">Assigned staff<select name="member" required className={selectStyle}><option value="">Select staff</option>{members.filter(x=>x.contact).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="text-xs">Due (IST)<Input name="due" type="datetime-local" required/></label>
      <label className="text-xs sm:col-span-2">Follow-up note<Input name="note" required maxLength={1000}/></label>
      <Button size="sm" disabled={busy} type="submit">Schedule</Button>
    </form>
  </details>;
}
export function CompleteTask({id}:{id:string}) {
  const {busy,save}=useSave();
  return <form className="flex flex-wrap gap-2" onSubmit={event=>{event.preventDefault();const f=new FormData(event.currentTarget);void save("/api/v1/admissions/contact-tasks","POST",{action:"COMPLETE",taskId:id,outcome:f.get("outcome"),completionNote:f.get("note")});}}>
    <select aria-label="Outcome" name="outcome" className="rounded-md border bg-background px-2 text-sm">{followUpOutcomes.map(x=><option key={x}>{x}</option>)}</select>
    <Input name="note" aria-label="Completion note" placeholder="Completion note" className="max-w-xs"/>
    <Button size="sm" disabled={busy}>Complete</Button>
  </form>;
}

export function EnquiryAdminAction({id,action}:{id:string;action:"ACCEPT"|"DISMISS"|"REOPEN"}) {
 const {busy,save}=useSave();
 return <Button size="sm" variant={action==="DISMISS"?"outline":"default"} disabled={busy} onClick={()=>{if(action==="DISMISS"&&!window.confirm("Dismiss and redact this parent enquiry?"))return;void save("/api/v1/admissions/intake/"+id,"PATCH",{action});}}>{action==="ACCEPT"?"Accept enquiry":action==="DISMISS"?"Dismiss & redact":"Restore closed enquiry"}</Button>;
}

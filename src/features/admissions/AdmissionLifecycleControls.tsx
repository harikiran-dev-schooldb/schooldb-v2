"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { assessAge,eligibleClassIds } from "./age-policy";
import { AgeFeePreview,type AdmissionYearChoice,type AdmissionClassChoice } from "./AdmissionCalculator";
import { Badge } from "@/components/ui/badge";
import { AdmissionSelect, AdmissionDetails } from "./AdmissionWorkspaceUI";
import { documentsReady } from "./lifecycle-policy";
import { BellRing, CalendarClock, CheckCircle2, ShieldCheck } from "lucide-react";
function useSave(){const [busy,setBusy]=useState(false);const router=useRouter();async function save(path:string,method:string,body:object){setBusy(true);try{const r=await fetch(path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const b=await r.json();if(!r.ok||!b.success)throw Error(b.message||"Unable to save.");toast.success(b.message);router.refresh();return true;}catch(e){toast.error(e instanceof Error?e.message:"Unable to save.");return false;}finally{setBusy(false);}}return {busy,save};}
export function CreateApplicationFromEnquiry({id,dob,year,classes,classId,admin,studentName,parentName,undertakingHref}:{id:string;dob:string|null;year:AdmissionYearChoice|undefined;classes:AdmissionClassChoice[];classId:string;admin:boolean;studentName:string;parentName:string;undertakingHref:string}){
 const {busy,save}=useSave();
 const [gender,setGender]=useState("");
 const [date,setDate]=useState(dob??"");
 const [confirmed,setConfirmed]=useState(false);
 const [signedBy,setSignedBy]=useState(parentName);
 const [reference,setReference]=useState("");
 const [reason,setReason]=useState("");
 const [signedDate,setSignedDate]=useState("");
 const status=date?assessAge(date,year?.policy,classId).status:null;
 const mismatch=status==="INELIGIBLE";
 const eligible=classes.filter(c=>eligibleClassIds(date,year?.policy).includes(c.id));
 const selected=classes.find(c=>c.id===classId)?.name??"Selected class";
 const ready=Boolean(gender&&date&&status!=="INVALID_DATE"&&(!mismatch||(admin&&confirmed&&signedBy.trim().length>=2&&reference.trim().length>=2&&reason.trim().length>=10&&signedDate)));
 return <AdmissionDetails title="Create application" description="Review eligibility and complete the missing student information." label="Create application"><form className="space-y-5" onSubmit={(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!ready)return;const data=new FormData(event.currentTarget);void save("/api/v1/admissions/intake/"+id+"/application","POST",{...Object.fromEntries(data),gender,...(mismatch?{undertaking:{signedBy,reference,reason,signedDate,confirmed}}:{})});}}>
 <div className="rounded-2xl border border-border/60 bg-muted/30 p-4"><p className="font-bold">{studentName}</p><p className="text-sm text-muted-foreground">{year?.name??"Academic year"} · Applying for {selected} · {parentName}</p></div>
 <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium">Date of birth<Input type="date" name="dob" value={date} onChange={e=>setDate(e.target.value)} readOnly={Boolean(dob)} required/></label><label className="space-y-1 text-sm font-medium">Gender<AdmissionSelect label="Gender" options={["MALE","FEMALE","OTHER"].map(x=>({id:x,name:x}))} value={gender} onChange={setGender}/></label><label className="space-y-1 text-sm font-medium">Guardian relationship<Input name="guardianRelation" maxLength={100}/></label><label className="space-y-1 text-sm font-medium">Previous school<Input name="previousSchool" maxLength={255}/></label></div>
 <AgeFeePreview dob={date} year={year} classes={classes} classId={classId}/>
 {mismatch&&<section className="space-y-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Parent undertaking required</h3><Badge variant="warning" className="dark:text-foreground">Age exception</Badge></div><p className="text-sm">Applied class: <strong>{selected}</strong> · Eligible class: <strong>{eligible.map(c=>c.name).join(", ")||"No matching rule"}</strong>.</p><p className="text-xs text-muted-foreground">Only proceed if this exception is permitted by applicable admission rules and approved by the school. A parent undertaking does not waive mandatory age requirements.</p><Button variant="outline" size="sm" asChild><a href={undertakingHref} target="_blank" rel="noreferrer">Print parent undertaking</a></Button>{admin?<><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm">Signed by<Input value={signedBy} onChange={e=>setSignedBy(e.target.value)} maxLength={255} required/></label><label className="space-y-1 text-sm">Signed date<Input type="date" value={signedDate} onChange={e=>setSignedDate(e.target.value)} required/></label><label className="space-y-1 text-sm sm:col-span-2">Signed document reference<Input placeholder="Physical file / undertaking register reference" value={reference} onChange={e=>setReference(e.target.value)} maxLength={150} required/></label><label className="space-y-1 text-sm sm:col-span-2">Reason for exception<Textarea value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={1000} required/></label></div><label className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1 size-4"/><span>I confirm the signed parent undertaking has been received, the school has authorized this exception and it is permitted under applicable rules.</span></label></>:<p className="text-sm font-medium">Ask a school administrator to record and approve the signed undertaking.</p>}</section>}
 <div className="flex justify-end border-t border-border/60 pt-4"><Button disabled={busy||!ready} type="submit">{mismatch?"Create with undertaking":"Create and link application"}</Button></div>
 </form></AdmissionDetails>;
}

type Doc={id:string;type:string;originalName:string;reviewStatus:string;reviewNote:string|null};
export function DocumentVerification({id,required,documents,editable}:{id:string;required:boolean;documents:Doc[];editable:boolean}){
 const {busy,save}=useSave();const path="/api/v1/admissions/"+id+"/document-review";
 return <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Document verification</h3><Badge variant={documentsReady(required,documents)?"success":"warning"} className="dark:text-foreground">{required?(documentsReady(true,documents)?"Verified":"Pending verification"):"Optional"}</Badge></div><p className="text-xs text-muted-foreground">When required, at least one uploaded document and verification of every uploaded document are needed before approval. This is not a statutory document checklist.</p>{editable&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void save(path,"PATCH",{action:"REQUIRE",required:!required})}>{required?"Make verification optional":"Require document verification"}</Button>}{!documents.length&&<p className="text-sm text-muted-foreground">No uploaded documents.</p>}{documents.map(d=><div key={d.id} className="space-y-2 rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><a className="text-sm font-medium text-primary underline" href={"/api/v1/admissions/"+id+"/documents/"+d.id} target="_blank" rel="noreferrer">{d.type.replaceAll("_"," ")} · {d.originalName}</a><Badge variant={d.reviewStatus==="VERIFIED"?"success":d.reviewStatus==="REJECTED"?"destructive":"outline"} className="dark:text-foreground">{d.reviewStatus}</Badge></div>{editable?<form className="grid gap-2 sm:grid-cols-3" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);void save(path,"PATCH",{action:"REVIEW",documentId:d.id,status:data.get("status"),note:data.get("note")});}}><AdmissionSelect key={d.reviewStatus} name="status" label="Review status" defaultValue={d.reviewStatus} options={["PENDING","VERIFIED","REJECTED"].map(x=>({id:x,name:x}))}/><Input name="note" placeholder="Review note / rejection reason" maxLength={500} defaultValue={d.reviewNote??""}/><Button disabled={busy} size="sm" type="submit">Save review</Button></form>:d.reviewNote&&<p className="text-xs">{d.reviewNote}</p>}</div>)}</section>;
}

function AdmissionAutomationSetting({title,description,enabled,kind,busy,onToggle}:{title:string;description:string;enabled:boolean;kind:"event"|"daily";busy:boolean;onToggle:()=>void}){
 const Icon=kind==="event"?BellRing:CalendarClock;
 const cadence=kind==="event"?"Real-time":"Daily digest";
 return <section className="premium-card group relative min-w-0 overflow-hidden rounded-3xl border border-border/70 shadow-sm transition hover:border-primary/25 hover:shadow-md">
  <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-primary/[0.07] blur-3xl"/>
  <div className="relative flex h-full flex-col">
   <div className="flex items-start justify-between gap-4 border-b border-border/60 bg-gradient-to-br from-primary/[0.055] via-transparent to-transparent p-5 sm:p-6">
    <div className="flex min-w-0 items-start gap-3.5"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10"><Icon className="size-5"/></span><div className="min-w-0"><p className="section-label">Admissions automation</p><h2 className="mt-1 text-lg font-black tracking-tight">{title}</h2></div></div>
    <Badge variant={enabled?"success":"outline"} className="shrink-0 dark:text-foreground"><span className={"mr-1.5 size-1.5 rounded-full "+(enabled?"bg-emerald-500":"bg-muted-foreground")}/>{enabled?"Active":"Paused"}</Badge>
   </div>
   <div className="flex flex-1 flex-col p-5 sm:p-6"><p className="text-sm leading-6 text-muted-foreground">{description}</p><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-2xl border border-border/60 bg-muted/25 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Cadence</p><p className="mt-1 text-sm font-bold">{cadence}</p></div><div className="rounded-2xl border border-border/60 bg-muted/25 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Privacy</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold"><ShieldCheck className="size-4 text-emerald-600"/>PII-free</p></div></div><div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5"><p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><CheckCircle2 className={"size-4 "+(enabled?"text-emerald-600":"text-muted-foreground")}/>{enabled?"Automation is running":"Automation is not sending"}</p><Button variant={enabled?"outline":"default"} className="rounded-xl" disabled={busy} onClick={onToggle}>{enabled?"Pause automation":"Enable automation"}</Button></div></div>
  </div>
 </section>;
}
export function AdmissionReminderSetting({enabled}:{enabled:boolean}){
 const {busy,save}=useSave();
 return <AdmissionAutomationSetting title="Daily administrator reminders" description="A daily summary of upcoming and overdue follow-ups, examinations, interviews, pending enquiries, document verification, approved applications awaiting admission and applications without an update for 3 days. Delivery uses the existing SchoolDB notification queue and requires the scheduled cron." enabled={enabled} kind="daily" busy={busy} onToggle={()=>void save("/api/v1/admissions/reminders","PATCH",{enabled:!enabled})}/>;
}

export function AdmissionEventAlertSetting({enabled}:{enabled:boolean}){
 const {busy,save}=useSave();
 return <AdmissionAutomationSetting title="Admissions event alerts" description="Notify school administrators when an enquiry or application arrives, a decision changes, an entrance or interview stage changes, or a student is admitted. Device push requires a configured provider and notification permission." enabled={enabled} kind="event" busy={busy} onToggle={()=>void save("/api/v1/admissions/reminders","PATCH",{eventAlertsEnabled:!enabled})}/>;
}

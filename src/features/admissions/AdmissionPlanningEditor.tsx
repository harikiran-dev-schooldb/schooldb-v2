"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AdmissionYearChoice, AdmissionClassChoice } from "./AdmissionCalculator";
import { seatBalance } from "./planning-policy";
import { AdmissionPanel, AdmissionSelect } from "./AdmissionWorkspaceUI";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Users, Globe } from "lucide-react";
type Year=AdmissionYearChoice & {publicEnabled:boolean};
type Field="termFee"|"annualFees"|"seatCapacity";
type Counts=Record<string,{admitted:number;pending:number}>;
function usePlanningSave() {
 const [busy,setBusy]=useState(false);const router=useRouter();
 async function save(body:object){setBusy(true);try{const r=await fetch("/api/v1/admissions/planning",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const b=await r.json();if(!r.ok||!b.success)throw Error(b.message||"Save failed.");toast.success("Saved.");router.refresh();}catch(e){toast.error(e instanceof Error?e.message:"Save failed.");}finally{setBusy(false);}}
 return {busy,save};
}
function Cell({yearId,classId,field,value,admin}:{yearId:string;classId:string;field:Field;value:number|undefined;admin:boolean}){
 const [draft,setDraft]=useState(value===undefined?"":String(value));const {busy,save}=usePlanningSave();
 if(!admin)return <span>{value??"—"}</span>;
 return <form className="flex min-w-40 gap-1" onSubmit={e=>{e.preventDefault();void save({yearId,classId,field,value:draft===""?null:Number(draft)});}}><Input aria-label={field} type="number" min={0} max={field==="seatCapacity"?100000:100000000} step={1} value={draft} onChange={e=>setDraft(e.target.value)}/><Button size="sm" type="submit" disabled={busy}>Save</Button></form>;
}
export function PlanningEditor({years,classes,mode,admin,counts}:{years:Year[];classes:AdmissionClassChoice[];mode:"fees"|"seats";admin:boolean;counts:Counts}){
 const [yearId,setYearId]=useState(years[0]?.id??"");const year=years.find(y=>y.id===yearId);
 return <AdmissionPanel title={mode==="fees"?"Class-wise fee directory":"Class-wise seat planning"} icon={mode==="fees"?IndianRupee:Users} action={<div className="w-full sm:w-56"><AdmissionSelect label="Academic year" options={years} value={yearId} onChange={setYearId}/></div>}>
 <p className="text-sm text-muted-foreground">{mode==="fees"?"School-approved admission quotes in INR. Not ERP fee bills. Blank means unconfigured.":"Planning targets, not enrollment limits. Balance = target minus converted applications."}</p>
 {year&&<div className="overflow-hidden rounded-xl border border-border/60"><Table><TableHeader><TableRow><TableHead>Class</TableHead>{mode==="fees"?<><TableHead>Term fee (₹)</TableHead><TableHead>Annual fees (₹)</TableHead></>:<><TableHead>Capacity</TableHead><TableHead>Admitted</TableHead><TableHead>Pending</TableHead><TableHead>Balance</TableHead></>}</TableRow></TableHeader><TableBody>{classes.map(c=>{const p=year.planning[c.id];const n=counts[year.id+":"+c.id]??{admitted:0,pending:0};return <TableRow key={c.id}><TableCell className="font-semibold">{c.name}</TableCell>{mode==="fees"?<><TableCell><Cell key={year.id+c.id+"term"} yearId={year.id} classId={c.id} field="termFee" value={p?.termFee} admin={admin}/></TableCell><TableCell><Cell key={year.id+c.id+"annual"} yearId={year.id} classId={c.id} field="annualFees" value={p?.annualFees} admin={admin}/></TableCell></>:<><TableCell><Cell key={year.id+c.id+"seat"} yearId={year.id} classId={c.id} field="seatCapacity" value={p?.seatCapacity} admin={admin}/></TableCell><TableCell>{n.admitted}</TableCell><TableCell>{n.pending}</TableCell><TableCell>{seatBalance(p?.seatCapacity,n.admitted)??"—"}</TableCell></>}</TableRow>})}</TableBody></Table></div>}</AdmissionPanel>;
}
export function PublicEnquirySetting({years}:{years:Year[]}){
 const {busy,save}=usePlanningSave();
 return <AdmissionPanel title="Parent enquiry portal" icon={Globe}><p className="text-sm text-muted-foreground">Disabled by default. Enable only after school approval. The public form uses consent and server rate limiting.</p>{years.map(y=><div key={y.id} className="flex items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{y.name}</span><Badge variant={y.publicEnabled?"success":"outline"} className={y.publicEnabled?"dark:text-emerald-300":undefined}>{y.publicEnabled?"Enabled":"Disabled"}</Badge></div><Button size="sm" disabled={busy} onClick={()=>void save({yearId:y.id,publicEnabled:!y.publicEnabled})}>{y.publicEnabled?"Disable":"Enable"}</Button></div>)}</AdmissionPanel>;
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AdmissionYearChoice, AdmissionClassChoice } from "./AdmissionCalculator";
import { seatBalance } from "./planning-policy";
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
 return <section className="space-y-4 rounded-2xl border bg-card p-4"><label className="block text-sm font-medium">Academic year<select className="block rounded-md border bg-background p-2" value={yearId} onChange={e=>setYearId(e.target.value)}>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
 <p className="text-sm text-muted-foreground">{mode==="fees"?"School-approved admission quotes in INR. Not ERP fee bills. Blank means unconfigured.":"Planning targets, not enrollment limits. Balance = target minus converted applications."}</p>
 {year&&<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Class</th>{mode==="fees"?<><th className="p-2">Term fee (₹)</th><th className="p-2">Annual fees (₹)</th></>:<><th className="p-2">Capacity</th><th className="p-2">Admitted</th><th className="p-2">Pending</th><th className="p-2">Balance</th></>}</tr></thead><tbody>{classes.map(c=>{const p=year.planning[c.id];const n=counts[year.id+":"+c.id]??{admitted:0,pending:0};return <tr className="border-b" key={c.id}><th className="p-2">{c.name}</th>{mode==="fees"?<><td className="p-2"><Cell key={year.id+c.id+"term"} yearId={year.id} classId={c.id} field="termFee" value={p?.termFee} admin={admin}/></td><td className="p-2"><Cell key={year.id+c.id+"annual"} yearId={year.id} classId={c.id} field="annualFees" value={p?.annualFees} admin={admin}/></td></>:<><td className="p-2"><Cell key={year.id+c.id+"seat"} yearId={year.id} classId={c.id} field="seatCapacity" value={p?.seatCapacity} admin={admin}/></td><td className="p-2">{n.admitted}</td><td className="p-2">{n.pending}</td><td className="p-2">{seatBalance(p?.seatCapacity,n.admitted)??"—"}</td></>}</tr>})}</tbody></table></div>}</section>;
}
export function PublicEnquirySetting({years}:{years:Year[]}){
 const {busy,save}=usePlanningSave();
 return <section className="space-y-3 rounded-2xl border bg-card p-5"><h2 className="font-bold">Parent enquiry portal</h2><p className="text-sm text-muted-foreground">Disabled by default. Enable only after school approval. The public form uses consent and server rate limiting.</p>{years.map(y=><div key={y.id} className="flex items-center justify-between gap-3"><span>{y.name} · {y.publicEnabled?"Enabled":"Disabled"}</span><Button size="sm" disabled={busy} onClick={()=>void save({yearId:y.id,publicEnabled:!y.publicEnabled})}>{y.publicEnabled?"Disable":"Enable"}</Button></div>)}</section>;
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarRange } from "lucide-react";
import { AdmissionPanel } from "./AdmissionWorkspaceUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
type Year={id:string;name:string;active:boolean;admissionsEnabled:boolean};
export function AdmissionYearSettings({years}:{years:Year[]}) {
 const [busy,setBusy]=useState(false);const router=useRouter();
 async function change(year:Year){setBusy(true);try{const r=await fetch("/api/v1/admissions/years",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({yearId:year.id,enabled:!year.admissionsEnabled})});const b=await r.json();if(!r.ok||!b.success)throw Error(b.message||"Unable to update.");toast.success(b.message);router.refresh();}catch(e){toast.error(e instanceof Error?e.message:"Unable to update.");}finally{setBusy(false);}}
 return <AdmissionPanel title="Admissions academic years" description="Independent of the active teaching year. Latest enabled year is selected by default." icon={CalendarRange}>
 {years.map(y=><div key={y.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3"><div className="flex flex-wrap items-center gap-2"><strong>{y.name}</strong>{y.active&&<Badge variant="outline">Teaching year</Badge>}<Badge variant={y.admissionsEnabled?"success":"outline"} className="dark:text-foreground">{y.admissionsEnabled?"Admissions enabled":"Admissions closed"}</Badge></div><Button size="sm" variant={y.admissionsEnabled?"outline":"default"} disabled={busy} onClick={()=>void change(y)}>{y.admissionsEnabled?"Close admissions year":"Enable admissions year"}</Button></div>)}
 <p className="text-xs text-muted-foreground">Closing a year hides it from operational admissions filters and disables its parent enquiry portal. If it is also the active teaching year, the full public application form closes as well. It does not delete records or change attendance, enrollment, or teaching-year status. Enable the year again to resume admissions.</p>
 </AdmissionPanel>;
}

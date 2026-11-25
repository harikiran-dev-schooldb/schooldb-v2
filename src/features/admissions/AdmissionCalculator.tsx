"use client";
import { useState } from "react";
import { CalendarDays, Calculator, GraduationCap, IndianRupee, RotateCcw } from "lucide-react";
import { calculateExactAge, eligibleClassIds, assessAge, type AdmissionAgePolicy } from "./age-policy";
import type { AdmissionPlanning } from "./planning-policy";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdmissionPanel, AdmissionSelect } from "./AdmissionWorkspaceUI";
export type AdmissionYearChoice = { id:string; name:string; policy:AdmissionAgePolicy|null; planning:AdmissionPlanning };
export type AdmissionClassChoice = { id:string; name:string };
const rupees = (amount: number | undefined) => amount === undefined ? "Not configured" : new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(amount);
export function AgeFeePreview({dob,year,classes,classId}:{dob:string;year:AdmissionYearChoice|undefined;classes:AdmissionClassChoice[];classId:string}) {
 const policy=year?.policy;
 const age=policy && dob ? calculateExactAge(dob,policy.ageAsOfDate) : null;
 const ids=eligibleClassIds(dob,policy);
 const matches=classes.filter(c=>ids.includes(c.id));
 const status=dob&&classId?assessAge(dob,policy,classId).status:null;
 const fee=year?.planning[classId];
 return <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5" aria-live="polite">
  <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Calculator className="size-4 text-primary"/><p className="font-bold">Age &amp; admission eligibility</p></div><Badge variant="outline">Cutoff: {policy?.ageAsOfDate??"Not configured"}</Badge></div>
  {!policy?<p className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">Ask an administrator to configure the academic-year age policy.</p>:!dob?<p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">Enter the date of birth to calculate age and eligible classes.</p>:!age?<p className="text-sm text-destructive">Enter a valid date of birth on or before the cutoff.</p>:<><div className="grid grid-cols-3 gap-2 sm:gap-3">{[[age.years,"Years"],[age.months,"Months"],[age.days,"Days"]].map(([n,label])=><div key={label} className="premium-card rounded-xl p-3 text-center sm:p-4"><p className="text-2xl font-bold tabular-nums tracking-tight text-primary sm:text-3xl">{n}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p></div>)}</div><p className="text-xs font-medium text-muted-foreground">{age.totalMonths} completed months</p><div className="flex flex-wrap items-center gap-2"><GraduationCap className="size-4 text-primary"/><span className="text-sm font-semibold">Eligible classes</span>{matches.length?matches.map(c=><Badge key={c.id} variant="default">{c.name}</Badge>):<Badge variant="outline">No matching configured rule</Badge>}</div></>}
  {status&&<div className="flex items-center justify-between gap-2 text-sm"><span className="text-muted-foreground">Selected class</span><Badge variant={status==="ELIGIBLE"?"success":status==="INELIGIBLE"||status==="INVALID_DATE"?"destructive":"outline"} className={status==="ELIGIBLE"?"dark:text-emerald-300":undefined}>{status.replaceAll("_"," ")}</Badge></div>}
  {classId&&<div className="grid grid-cols-2 gap-2"><div className="premium-card rounded-xl p-3"><IndianRupee className="mb-2 size-4 text-primary"/><p className="text-xs text-muted-foreground">Term fee</p><p className="break-words font-bold tabular-nums">{rupees(fee?.termFee)}</p></div><div className="premium-card rounded-xl p-3"><IndianRupee className="mb-2 size-4 text-primary"/><p className="text-xs text-muted-foreground">Annual fees</p><p className="break-words font-bold tabular-nums">{rupees(fee?.annualFees)}</p></div></div>}
  <p className="text-xs text-muted-foreground">Fees are admission quotes, not a student bill or payment request.</p>
 </div>;
}
export function AdmissionCalculator({years,classes}:{years:AdmissionYearChoice[];classes:AdmissionClassChoice[]}) {
 const [yearId,setYearId]=useState(years[0]?.id??"");
 const [dob,setDob]=useState("");
 const [classId,setClassId]=useState("");
 const year=years.find(y=>y.id===yearId);
 return <><section className="premium-hero p-5 sm:p-7"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><CalendarDays className="size-6"/></div><div><p className="section-label">Admissions intelligence</p><h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Calculate age with confidence</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">Use your school's approved academic-year cutoff and class age limits.</p></div></div></section>
 <AdmissionPanel title="Eligibility calculator" description="Choose a year and date of birth." icon={Calculator} action={<Button variant="outline" size="sm" onClick={()=>{setDob("");setClassId("");setYearId(years[0]?.id??"");}}><RotateCcw/>Reset</Button>}>
 <div className="grid gap-4 md:grid-cols-3"><label className="space-y-2 text-sm font-semibold">Academic year<AdmissionSelect label="Academic year" options={years} value={yearId} onChange={setYearId}/></label><label className="space-y-2 text-sm font-semibold">Date of birth<Input className="h-11 rounded-xl" type="date" value={dob} onChange={e=>setDob(e.target.value)}/></label><label className="space-y-2 text-sm font-semibold">Applied class<AdmissionSelect label="Applied class" options={[{id:"",name:"Any eligible class"},...classes]} value={classId} onChange={setClassId}/></label></div>
 <AgeFeePreview dob={dob} year={year} classes={classes} classId={classId}/>
 {!years.length&&<p className="text-sm text-muted-foreground">No active academic year. Ask the school administrator to configure one.</p>}
 </AdmissionPanel></>;
}

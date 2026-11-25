"use client";
import { useState } from "react";
import { calculateExactAge, eligibleClassIds, assessAge, type AdmissionAgePolicy } from "./age-policy";
import type { AdmissionPlanning } from "./planning-policy";
import { Input } from "@/components/ui/input";
export type AdmissionYearChoice = { id:string; name:string; policy:AdmissionAgePolicy|null; planning:AdmissionPlanning };
export type AdmissionClassChoice = { id:string; name:string };
const rupees = (amount: number | undefined) => amount === undefined ? "Not configured" : new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(amount);
export function AgeFeePreview({dob,year,classes,classId}:{dob:string;year:AdmissionYearChoice|undefined;classes:AdmissionClassChoice[];classId:string}) {
  const policy=year?.policy;
  const age=policy && dob ? calculateExactAge(dob,policy.ageAsOfDate) : null;
  const matches=classes.filter(c=>eligibleClassIds(dob,policy).includes(c.id));
  const status=dob&&classId?assessAge(dob,policy,classId).status:null;
  const fee=year?.planning[classId];
  return <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm" aria-live="polite">
    <p className="font-bold">Age &amp; admission eligibility</p>
    <p>Cutoff: {policy?.ageAsOfDate??"Not configured"}</p>
    {dob&&policy&&!age&&<p>Enter a valid date of birth on or before the cutoff.</p>}
    {age&&<><p className="text-lg font-black">{age.years} years · {age.months} months · {age.days} days</p><p>{age.totalMonths} completed months</p><p>Eligible classes: <strong>{matches.length?matches.map(c=>c.name).join(", "):"No matching configured rule"}</strong></p></>}
    {status&&<p>Selected class: <strong>{status.replaceAll("_"," ")}</strong></p>}
    {classId&&<div className="grid grid-cols-2 gap-2"><div>Term fee: <strong>{rupees(fee?.termFee)}</strong></div><div>Annual fees: <strong>{rupees(fee?.annualFees)}</strong></div></div>}
    <p className="text-xs text-muted-foreground">Fees are admission quotes, not a student bill or payment request.</p>
  </div>;
}
export function AdmissionCalculator({years,classes}:{years:AdmissionYearChoice[];classes:AdmissionClassChoice[]}) {
  const [yearId,setYearId]=useState(years[0]?.id??"");
  const [dob,setDob]=useState("");
  const [classId,setClassId]=useState("");
  const year=years.find(y=>y.id===yearId);
  return <section className="space-y-4 rounded-2xl border bg-card p-5">
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="text-sm font-medium">Academic year<select className="mt-1 block w-full rounded-md border bg-background p-2" value={yearId} onChange={e=>setYearId(e.target.value)}>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
      <label className="text-sm font-medium">Date of birth<Input type="date" value={dob} onChange={e=>setDob(e.target.value)}/></label>
      <label className="text-sm font-medium">Applied class<select className="mt-1 block w-full rounded-md border bg-background p-2" value={classId} onChange={e=>setClassId(e.target.value)}><option value="">Any eligible class</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    </div>
    <AgeFeePreview dob={dob} year={year} classes={classes} classId={classId}/>
    {!years.length&&<p>No active academic year. Ask the school administrator to configure one.</p>}
  </section>;
}

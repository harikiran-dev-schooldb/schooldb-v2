import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { PageContainer,PageHeader } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { isRouteAllowed } from "@/lib/route-access";
import { isMemberRouteAllowed } from "@/lib/navigation-access";
import { admissionWorkspaceOptions } from "@/features/admissions/workspace.service";
import { AdmissionPanel } from "@/features/admissions/AdmissionWorkspaceUI";

export default async function Page({params,searchParams}:{params:Promise<{schoolSlug:string}>;searchParams:Promise<{year?:string}>}){
 const {schoolSlug}=await params;const query=await searchParams;
 const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN"],schoolSlug);
 if(!["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role))throw new ApiError(403,"Administrator required.");
 const scope={schoolId:actor.schoolId};
 const [options,syllabi,branches,activeSections,staff,setting]=await Promise.all([
  admissionWorkspaceOptions(actor.schoolId),
  prisma.syllabus.count({where:{...scope,active:true}}),
  prisma.academicBranch.count({where:{...scope,active:true,syllabus:{active:true,schoolId:actor.schoolId}}}),
  prisma.section.findMany({where:{active:true,class:{...scope,active:true}},select:{classId:true},distinct:["classId"]}),
  prisma.membership.count({where:{...scope,isActive:true,role:{in:["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"]}}}),
  prisma.schoolAdmissionSetting.findUnique({where:scope}),
 ]);
 const year=options.years.find(y=>y.id===query.year)??options.years[0];
 const classes=options.classes;
 const sectionCount=classes.filter(c=>activeSections.some(s=>s.classId===c.id)).length;
 const ageCount=classes.filter(c=>year?.policy?.rules[c.id]).length;
 const feeCount=classes.filter(c=>year?.planning[c.id]?.termFee!==undefined&&year?.planning[c.id]?.annualFees!==undefined).length;
 const seatsCount=classes.filter(c=>year?.planning[c.id]?.seatCapacity!==undefined).length;
 const rows=[
  {label:"Syllabi & branches",detail:syllabi+" active syllabi · "+branches+" active branches. Each class needs a branch.",route:"setup/academic-structure",done:syllabi>0&&branches>0,required:true},
  {label:"Academic year",detail:year?"Admissions enabled for "+year.name:"Create a year and enable it in Admission Settings.",route:year?"admissions/settings":"academic-year",done:Boolean(year),required:true},
  {label:"Classes",detail:classes.length+" active classes. Add only classes offered by this school.",route:"classes",done:classes.length>0,required:true},
  {label:"Sections",detail:sectionCount+" of "+classes.length+" active classes have at least one active section.",route:"sections",done:classes.length>0&&sectionCount===classes.length,required:true},
  {label:"School users",detail:staff+" active admissions-capable role accounts. Review individual permissions and create separate staff logins.",route:"users",done:staff>0,required:true},
  {label:"Age eligibility rules",detail:ageCount+" of "+classes.length+" classes have age limits for "+(year?.name??"the selected year")+". Review the approved cutoff and minimum/maximum months.",route:"admissions/settings",done:Boolean(year?.policy)&&classes.length>0&&ageCount===classes.length,required:true},
  {label:"Admission fee quotes",detail:feeCount+" of "+classes.length+" classes have term and annual fee quotes. These are not ERP payment bills.",route:"admissions/fees",done:Boolean(year)&&classes.length>0&&feeCount===classes.length,required:false},
  {label:"Seat targets",detail:seatsCount+" of "+classes.length+" classes have seat targets. Capacity is for planning, not a hard enrollment limit.",route:"admissions/planning",done:Boolean(year)&&classes.length>0&&seatsCount===classes.length,required:false},
  {label:"Automatic admission numbering",detail:setting?.automaticNumbering?"Automatic numbering enabled. Review prefix and next number.":"Manual admission numbers remain available.",route:"admissions/settings",done:Boolean(setting?.automaticNumbering),required:false},
  {label:"Parent enquiry portal",detail:year?.publicEnabled?"Public enquiries enabled for "+year.name:"Optional. Enable only after reviewing age rules and school approval.",route:"admissions/settings",done:Boolean(year?.publicEnabled),required:false},
  {label:"Daily admission reminders",detail:setting?.admissionRemindersEnabled?"Enabled; actual delivery depends on configured notification providers and cron.":"Optional. Turn on in Admission Settings.",route:"admissions/settings",done:Boolean(setting?.admissionRemindersEnabled),required:false},
 ];
 const required=rows.filter(r=>r.required);const complete=required.filter(r=>r.done).length;
 return <PageContainer><PageHeader title="Admissions setup" description="Prepare the school for admissions without enabling unrelated ERP modules."/><section className="premium-hero rounded-3xl p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">School readiness</h2><p className="mt-1 text-sm text-muted-foreground">{year?.name??"No enabled admissions year"} · {complete} of {required.length} essential checks complete</p></div><Badge variant={complete===required.length?"success":"warning"}>{complete===required.length?"Essential setup recorded":"Setup incomplete"}</Badge></div><progress className="mt-4 h-2 w-full accent-primary" max={required.length} value={complete}/><p className="mt-2 text-xs text-muted-foreground">This checklist checks configuration, not statutory approval or live login/delivery tests. It does not block existing admissions.</p>{options.years.length>1&&<div className="mt-3 flex flex-wrap gap-2">{options.years.map(y=><Button key={y.id} asChild variant={y.id===year?.id?"default":"outline"} size="sm"><Link href={"?year="+encodeURIComponent(y.id)}>{y.name}</Link></Button>)}</div>}</section>{[true,false].map(essential=><AdmissionPanel key={String(essential)} title={essential?"Essential setup":"Optional enhancements"}>{rows.filter(r=>r.required===essential).map((r,i)=><div key={r.label} className="flex flex-wrap items-start gap-3 rounded-xl border border-border/60 p-4 sm:items-center"><div className={r.done?"text-emerald-600":"text-muted-foreground"}>{r.done?<CheckCircle2 className="size-5"/>:<Circle className="size-5"/>}</div><div className="min-w-0 flex-1"><p className="font-semibold">{i+1}. {r.label}</p><p className="text-xs leading-5 text-muted-foreground">{r.detail}</p></div>{isRouteAllowed(actor.school,r.route)&&isMemberRouteAllowed(actor,r.route)?<Button asChild variant="outline" size="sm"><Link href={"/"+schoolSlug+"/"+r.route+(year?"?year="+encodeURIComponent(year.id):"")}>{r.done?"Review":"Configure"}<ArrowRight className="size-4"/></Link></Button>:<Badge variant="outline">Route unavailable</Badge>}</div>)}</AdmissionPanel>)}</PageContainer>;
}

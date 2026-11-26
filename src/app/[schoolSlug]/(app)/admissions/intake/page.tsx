import Link from "next/link";
import { connection } from "next/server";
import { PageContainer, PageHeader } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CalendarDays, UserRound, Phone } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { prisma } from "@/lib/prisma";
import { formatSchoolDateTime } from "@/lib/date-time";
import { EnquiryForm, EnquiryActions, ContactTaskForm, CompleteTask, EnquiryAdminAction } from "@/features/admissions/AdmissionIntakeControls";

import { admissionWorkspaceOptions } from "@/features/admissions/workspace.service";
import { calculateExactAge, eligibleClassIds, assessAge } from "@/features/admissions/age-policy";
import { ApiError } from "@/lib/errors";
import { AdmissionDetails, AdmissionPanel, AdmissionSelect } from "@/features/admissions/AdmissionWorkspaceUI";
import { Badge } from "@/components/ui/badge";
import { CreateApplicationFromEnquiry } from "@/features/admissions/AdmissionLifecycleControls";

async function requestTime() {
  return new Date();
}

export default async function IntakePage({params,searchParams}:{params:Promise<{schoolSlug:string}>;searchParams:Promise<{page?:string;taskPage?:string;view?:string;year?:string;search?:string;classId?:string;state?:string}>}) {
  await connection();
  const {schoolSlug}=await params; const query=await searchParams;
  const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"],schoolSlug);
  const manage=hasModuleAccess(actor,"ADMISSIONS","MANAGE");
  const admin=["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role);
  const page=Math.max(1,Math.min(10000,Number.parseInt(query.page||"1",10)||1));
  const taskPage=Math.max(1,Math.min(10000,Number.parseInt(query.taskPage||"1",10)||1));
  const scope={schoolId:actor.schoolId};
  const view=query.view==="parent-inbox"?"parent-inbox":query.view==="recovery"?"recovery":query.view==="follow-ups"?"follow-ups":"enquiries";
  if((view==="parent-inbox"||view==="recovery")&&!admin)throw new ApiError(403,"Administrator access required.");
  const options=await admissionWorkspaceOptions(actor.schoolId);
  const {years,classes}=options;
  const yearId=years.find(y=>y.id===query.year)?.id??years[0]?.id??"";
  const search=(query.search??"").trim().slice(0,100);
  const classId=classes.some(c=>c.id===query.classId)?query.classId:undefined;
  const enquiryScope={...scope,academicYearId:yearId,...(classId?{classId}:{}),...(search?{OR:[{studentName:{contains:search,mode:"insensitive" as const}},{parentName:{contains:search,mode:"insensitive" as const}},{mobile:{contains:search}}]}:{}),state: view==="parent-inbox"?"PENDING" as const:view==="recovery"?"CLOSED" as const:query.state==="OPEN"?"OPEN" as const:query.state==="LINKED"?"LINKED" as const:{in:["OPEN","LINKED"] as ("OPEN"|"LINKED")[]}};
  const taskScope={...scope,OR:[{application:{academicYearId:yearId,schoolId:actor.schoolId}},{enquiry:{academicYearId:yearId,schoolId:actor.schoolId}}]};
  const [staff,enquiries,enquiryCount,tasks,taskCount]=await Promise.all([
    prisma.membership.findMany({where:{...scope,isActive:true,role:{in:["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"]}},include:{user:{select:{firstName:true,lastName:true}}}}),
    prisma.admissionEnquiry.findMany({where:enquiryScope,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(page-1)*20,take:20,include:{academicYear:{select:{name:true}},applyingClass:{select:{name:true}},application:{select:{applicationNo:true}}}}),
    prisma.admissionEnquiry.count({where:enquiryScope}),
    prisma.admissionContactTask.findMany({where:taskScope,orderBy:[{completedAt:{sort:"asc",nulls:"first"}},{dueAt:"asc"},{id:"asc"}],skip:(taskPage-1)*20,take:20,include:{application:{select:{studentName:true,applicationNo:true}},enquiry:{select:{studentName:true,mobile:true}}}}),
    prisma.admissionContactTask.count({where:taskScope}),
  ]);
  const overdueIds = new Set((await prisma.admissionContactTask.findMany({ where: { ...scope, id: { in: tasks.map(task => task.id) }, completedAt: null, dueAt: { lt: await requestTime() } }, select: { id: true } })).map(task => task.id));
  const pageHref=(p:number,t:number)=>"?"+new URLSearchParams({view,year:yearId,page:String(p),taskPage:String(t),...(search?{search}:{}),...(classId?{classId}:{}),...(query.state?{state:query.state}:{})}).toString();
  const members=staff.map(x=>({id:x.id,name:[x.user.firstName,x.user.lastName].filter(Boolean).join(" ")||x.designation||"School staff",contact:true}));
  return <PageContainer>
    <PageHeader title={view==="parent-inbox"?"Parent enquiry inbox":view==="recovery"?"Admission recovery":view==="follow-ups"?"Parent follow-ups":"Admission enquiries"} description="Capture enquiries before application and manage parent contact." actions={<Button asChild variant="outline"><Link href={`/${schoolSlug}/admissions`}>Back to admissions</Link></Button>}/>
    {view==="parent-inbox"&&<p className="rounded-xl border p-4 text-sm">Parent enquiry portal: <Link className="underline" href={`/${schoolSlug}/apply/enquire`} target="_blank">Open public enquiry form</Link>. Enable it in Admission Settings for the intended year.</p>}
    <div className="premium-card flex flex-col gap-3 rounded-2xl p-4 xl:flex-row xl:items-end"><form className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><input type="hidden" name="view" value={view}/><label className="space-y-1 text-xs font-semibold">Academic year<AdmissionSelect key={yearId||"no-year"} name="year" label="Academic year" defaultValue={yearId} options={years}/></label>{view!=="follow-ups"&&<><label className="space-y-1 text-xs font-semibold">Search<div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input name="search" defaultValue={search} placeholder="Name or mobile" className="h-11 pl-9"/></div></label><label className="space-y-1 text-xs font-semibold">Class<AdmissionSelect name="classId" label="Class" defaultValue={classId??""} options={[{id:"",name:"All classes"},...classes]}/></label>{view==="enquiries"&&<label className="space-y-1 text-xs font-semibold">Status<AdmissionSelect name="state" label="Status" defaultValue={query.state==="OPEN"||query.state==="LINKED"?query.state:""} options={[{id:"",name:"All statuses"},{id:"OPEN",name:"Open"},{id:"LINKED",name:"Application created"}]}/></label>}</>}<div className="flex gap-2 sm:col-span-2 lg:col-span-4"><Button type="submit" className="h-10">Apply filters</Button><Button asChild variant="ghost" className="h-10"><Link href={"?view="+view+"&year="+yearId}>Reset</Link></Button></div></form>{manage&&view==="enquiries"&&<EnquiryForm key={yearId} years={years} classes={classes} defaultYearId={yearId}/>}</div>
    {!yearId&&<p className="text-sm text-muted-foreground">Ask an administrator to enable an admissions academic year in Settings.</p>}
    {view!=="follow-ups"&&<AdmissionPanel title={view==="parent-inbox"?"Pending parent enquiries":view==="recovery"?"Closed enquiries":"Enquiry directory"} description={enquiryCount+" records"}>
      {!enquiries.length && <p className="text-sm text-muted-foreground">No enquiries on this page.</p>}
      <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)] gap-4 px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground xl:grid"><span>Student &amp; parent</span><span>Class &amp; eligibility</span><span>Age &amp; enquiry</span><span>Actions</span></div>
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">{enquiries.map(x=>{
       const year=years.find(y=>y.id===x.academicYearId);
       const dob=x.dob?.toISOString().slice(0,10)??"";
       const policy=year?.policy;
       const age=dob&&policy?calculateExactAge(dob,policy.ageAsOfDate):null;
       const eligibility=dob?assessAge(dob,policy,x.classId).status:null;
       const eligible=classes.filter(c=>eligibleClassIds(dob,policy).includes(c.id));
       const mismatch=eligibility==="INELIGIBLE";
       return <article key={x.id} className="grid min-w-0 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)] xl:items-start xl:gap-4">
       <div className="min-w-0 space-y-1"><div className="flex flex-wrap items-center gap-2"><strong className="break-words text-sm font-bold">{x.studentName}</strong><Badge variant={x.state==="LINKED"?"success":x.state==="PENDING"?"warning":"outline"} className="dark:text-foreground">{x.state==="LINKED"?"Application created":x.state}</Badge></div><p className="flex items-center gap-2 text-xs text-muted-foreground"><UserRound className="size-3.5 shrink-0"/>{x.parentName}</p><a href={"tel:"+x.mobile} className="flex items-center gap-2 text-xs font-medium text-primary"><Phone className="size-3.5 shrink-0"/>{x.mobile}</a></div>
       <div className="min-w-0 space-y-1"><p className="text-xs text-muted-foreground">Applied class</p><p className="font-semibold">{x.applyingClass.name}</p><p className="text-xs text-muted-foreground">Eligible: <strong className="text-foreground">{eligible.map(c=>c.name).join(", ")||(dob?"No matching rule":"DOB not recorded")}</strong></p>{mismatch?<Badge variant="warning" className="dark:text-foreground">Undertaking required</Badge>:eligibility==="ELIGIBLE"?<Badge variant="success" className="dark:text-foreground">Eligible</Badge>:null}</div>
       <div className="min-w-0 space-y-1"><p className="text-xs text-muted-foreground">Age at cutoff</p><p className="text-sm font-semibold tabular-nums">{age?age.years+"y "+age.months+"m "+age.days+"d":"—"}</p><p className="text-xs text-muted-foreground">DOB: {dob||"Not recorded"}</p><p className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground"><CalendarDays className="size-3.5"/>{formatSchoolDateTime(x.createdAt)} · {x.source.replaceAll("_"," ")}</p></div>
       <div className="flex min-w-0 flex-wrap items-center gap-2">{view==="parent-inbox"&&<><EnquiryAdminAction id={x.id} action="ACCEPT"/><EnquiryAdminAction id={x.id} action="DISMISS"/></>}{view==="recovery"&&<EnquiryAdminAction id={x.id} action="REOPEN"/>}{manage&&x.state==="OPEN"&&<CreateApplicationFromEnquiry id={x.id} dob={dob||null} year={year} classes={classes} classId={x.classId} admin={admin} studentName={x.studentName} parentName={x.parentName} undertakingHref={`/${schoolSlug}/admissions/intake/${x.id}/undertaking`}/>}
       {manage&&x.state==="OPEN"&&<AdmissionDetails title={x.studentName} description="Link or close this enquiry." label="Manage"><EnquiryActions id={x.id}/></AdmissionDetails>}
       {manage&&(x.state==="OPEN"||x.state==="LINKED")&&<ContactTaskForm target="ENQUIRY" id={x.id} members={members}/>}
       {x.application&&<Button asChild size="sm" variant="outline"><Link href={`/${schoolSlug}/admissions?year=${yearId}&search=${encodeURIComponent(x.application.applicationNo)}`}>View application</Link></Button>}</div>
       {x.notes&&<p className="rounded-lg bg-muted/30 p-2 text-xs text-muted-foreground sm:col-span-2 xl:col-span-4">{x.notes}</p>}
       </article>;
      })}</div>
      <nav className="flex gap-3 text-sm">{page>1&&<Link href={pageHref(page-1,taskPage)}>Previous enquiries</Link>}{page*20<enquiryCount&&<Link href={pageHref(page+1,taskPage)}>Next enquiries</Link>}</nav>
    </AdmissionPanel>}
    {(view==="follow-ups"||view==="enquiries")&&<AdmissionPanel title="Parent follow-ups" description={taskCount+" records"}>
      {!tasks.length&&<p className="text-sm text-muted-foreground">No follow-ups on this page.</p>}
      {tasks.map(x=><article key={x.id} className="premium-card space-y-2 rounded-2xl p-4">
        <div className="flex flex-wrap justify-between gap-2"><strong>{x.application?.studentName||x.enquiry?.studentName}</strong><Badge variant={x.completedAt?"success":overdueIds.has(x.id)?"destructive":"outline"} className="dark:text-foreground">{x.completedAt?"COMPLETED":overdueIds.has(x.id)?"OVERDUE":"OPEN"}</Badge></div>
        <p className="text-sm">{x.assignedName} · Due {formatSchoolDateTime(x.dueAt)}</p>
        <p className="text-sm">{x.note}</p>
        {x.completedAt&&<p className="text-sm">{x.outcome} · {x.completionNote}</p>}
        {manage&&!x.completedAt&&(admin||actor.id===x.assignedMemberId)&&<CompleteTask id={x.id}/>}
      </article>)}
      <nav className="flex gap-3 text-sm">{taskPage>1&&<Link href={pageHref(page,taskPage-1)}>Previous follow-ups</Link>}{taskPage*20<taskCount&&<Link href={pageHref(page,taskPage+1)}>Next follow-ups</Link>}</nav>
    </AdmissionPanel>}
  </PageContainer>;
}

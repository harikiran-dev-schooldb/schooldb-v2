import Link from "next/link";
import { connection } from "next/server";
import { PageContainer, PageHeader } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { prisma } from "@/lib/prisma";
import { formatSchoolDateTime } from "@/lib/date-time";
import { EnquiryForm, EnquiryActions, ContactTaskForm, CompleteTask, EnquiryAdminAction } from "@/features/admissions/AdmissionIntakeControls";

import { admissionWorkspaceOptions } from "@/features/admissions/workspace.service";
import { calculateExactAge, eligibleClassIds } from "@/features/admissions/age-policy";
import { ApiError } from "@/lib/errors";
import { AdmissionDetails, AdmissionPanel, AdmissionSelect } from "@/features/admissions/AdmissionWorkspaceUI";
import { Badge } from "@/components/ui/badge";

async function requestTime() {
  return new Date();
}

export default async function IntakePage({params,searchParams}:{params:Promise<{schoolSlug:string}>;searchParams:Promise<{page?:string;taskPage?:string;view?:string;year?:string}>}) {
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
  const enquiryScope={...scope,academicYearId:yearId,state: view==="parent-inbox"?"PENDING" as const:view==="recovery"?"CLOSED" as const:{in:["OPEN","LINKED"] as ("OPEN"|"LINKED")[]}};
  const taskScope={...scope,OR:[{application:{academicYearId:yearId,schoolId:actor.schoolId}},{enquiry:{academicYearId:yearId,schoolId:actor.schoolId}}]};
  const [staff,enquiries,enquiryCount,tasks,taskCount]=await Promise.all([
    prisma.membership.findMany({where:{...scope,isActive:true,role:{in:["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"]}},include:{user:{select:{firstName:true,lastName:true}}}}),
    prisma.admissionEnquiry.findMany({where:enquiryScope,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(page-1)*20,take:20,include:{academicYear:{select:{name:true}},applyingClass:{select:{name:true}},application:{select:{applicationNo:true}}}}),
    prisma.admissionEnquiry.count({where:enquiryScope}),
    prisma.admissionContactTask.findMany({where:taskScope,orderBy:[{completedAt:{sort:"asc",nulls:"first"}},{dueAt:"asc"},{id:"asc"}],skip:(taskPage-1)*20,take:20,include:{application:{select:{studentName:true,applicationNo:true}},enquiry:{select:{studentName:true,mobile:true}}}}),
    prisma.admissionContactTask.count({where:taskScope}),
  ]);
  const overdueIds = new Set((await prisma.admissionContactTask.findMany({ where: { ...scope, id: { in: tasks.map(task => task.id) }, completedAt: null, dueAt: { lt: await requestTime() } }, select: { id: true } })).map(task => task.id));
  const members=staff.map(x=>({id:x.id,name:[x.user.firstName,x.user.lastName].filter(Boolean).join(" ")||x.designation||"School staff",contact:true}));
  return <PageContainer>
    <PageHeader title={view==="parent-inbox"?"Parent enquiry inbox":view==="recovery"?"Admission recovery":view==="follow-ups"?"Parent follow-ups":"Admission enquiries"} description="Capture enquiries before application and manage parent contact." actions={<Button asChild variant="outline"><Link href={`/${schoolSlug}/admissions`}>Back to admissions</Link></Button>}/>
    {view==="parent-inbox"&&<p className="rounded-xl border p-4 text-sm">Parent enquiry portal: <Link className="underline" href={`/${schoolSlug}/apply/enquire`} target="_blank">Open public enquiry form</Link>. Enable it in Admission Settings for the intended year.</p>}
    <form className="premium-card flex flex-wrap items-center gap-2 p-4"><input type="hidden" name="view" value={view}/><div className="w-full sm:w-56"><AdmissionSelect key={yearId||"no-year"} name="year" label="Academic year" defaultValue={yearId} options={years}/></div><Button type="submit" className="h-11">Apply year</Button></form>
    {manage && view==="enquiries" && <EnquiryForm key={yearId} years={years} classes={classes} defaultYearId={yearId}/>}
    {!yearId&&<p className="text-sm text-muted-foreground">Ask an administrator to enable an admissions academic year in Settings.</p>}
    {view!=="follow-ups"&&<AdmissionPanel title={view==="parent-inbox"?"Pending parent enquiries":view==="recovery"?"Closed enquiries":"Enquiry directory"} description={enquiryCount+" records"}>
      {!enquiries.length && <p className="text-sm text-muted-foreground">No enquiries on this page.</p>}
      {enquiries.map(x=><article key={x.id} className="premium-card space-y-3 rounded-2xl p-4">
        <div className="flex flex-wrap justify-between gap-2"><strong>{x.studentName}</strong><Badge variant={x.state==="LINKED"?"success":x.state==="PENDING"?"warning":"outline"} className="dark:text-foreground">{x.state}</Badge></div>
        <p className="text-sm">{x.academicYear.name} · {x.applyingClass.name} · {x.parentName} · {x.mobile}</p>
        <p className="text-xs text-muted-foreground">{x.source} · {formatSchoolDateTime(x.createdAt)}{x.dob ? " · DOB "+x.dob.toISOString().slice(0,10):""}</p>
        {x.dob&&(()=>{const policy=years.find(y=>y.id===x.academicYearId)?.policy;const dob=x.dob.toISOString().slice(0,10);const age=policy?calculateExactAge(dob,policy.ageAsOfDate):null;return age?<p className="text-sm">Age: {age.years}y {age.months}m {age.days}d · Eligible: {classes.filter(c=>eligibleClassIds(dob,policy).includes(c.id)).map(c=>c.name).join(", ")||"No matching configured rule"}</p>:null;})()}
        {view==="parent-inbox"&&<div className="flex gap-2"><EnquiryAdminAction id={x.id} action="ACCEPT"/><EnquiryAdminAction id={x.id} action="DISMISS"/></div>}
        {view==="recovery"&&<EnquiryAdminAction id={x.id} action="REOPEN"/>}
        {x.notes && <p className="text-sm">{x.notes}</p>}{x.application && <p className="text-sm">Application: {x.application.applicationNo}</p>}
        {manage && x.state==="OPEN" && <AdmissionDetails title={x.studentName} description="Link or close this enquiry." label="Manage enquiry"><EnquiryActions id={x.id}/></AdmissionDetails>}
        {manage && (x.state==="OPEN"||x.state==="LINKED") && <ContactTaskForm target="ENQUIRY" id={x.id} members={members}/>}
      </article>)}
      <nav className="flex gap-3 text-sm">{page>1&&<Link href={`?view=${view}&year=${yearId}&page=${page-1}&taskPage=${taskPage}`}>Previous enquiries</Link>}{page*20<enquiryCount&&<Link href={`?view=${view}&year=${yearId}&page=${page+1}&taskPage=${taskPage}`}>Next enquiries</Link>}</nav>
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
      <nav className="flex gap-3 text-sm">{taskPage>1&&<Link href={`?view=${view}&year=${yearId}&page=${page}&taskPage=${taskPage-1}`}>Previous follow-ups</Link>}{taskPage*20<taskCount&&<Link href={`?view=${view}&year=${yearId}&page=${page}&taskPage=${taskPage+1}`}>Next follow-ups</Link>}</nav>
    </AdmissionPanel>}
  </PageContainer>;
}

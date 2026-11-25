import Link from "next/link";
import { connection } from "next/server";
import { PageContainer, PageHeader } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { prisma } from "@/lib/prisma";
import { formatSchoolDateTime } from "@/lib/date-time";
import { EnquiryForm, EnquiryActions, ContactTaskForm, CompleteTask } from "@/features/admissions/AdmissionIntakeControls";

async function requestTime() {
  return new Date();
}

export default async function IntakePage({params,searchParams}:{params:Promise<{schoolSlug:string}>;searchParams:Promise<{page?:string;taskPage?:string}>}) {
  await connection();
  const {schoolSlug}=await params; const query=await searchParams;
  const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"],schoolSlug);
  const manage=hasModuleAccess(actor,"ADMISSIONS","MANAGE");
  const admin=["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role);
  const page=Math.max(1,Math.min(10000,Number.parseInt(query.page||"1",10)||1));
  const taskPage=Math.max(1,Math.min(10000,Number.parseInt(query.taskPage||"1",10)||1));
  const scope={schoolId:actor.schoolId};
  const [years,classes,staff,enquiries,enquiryCount,tasks,taskCount]=await Promise.all([
    prisma.academicYear.findMany({where:{...scope,active:true},orderBy:{startDate:"desc"},select:{id:true,name:true}}),
    prisma.class.findMany({where:{...scope,active:true},orderBy:{displayOrder:"asc"},select:{id:true,name:true}}),
    prisma.membership.findMany({where:{...scope,isActive:true,role:{in:["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"]}},include:{user:{select:{firstName:true,lastName:true}}}}),
    prisma.admissionEnquiry.findMany({where:scope,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(page-1)*20,take:20,include:{academicYear:{select:{name:true}},applyingClass:{select:{name:true}},application:{select:{applicationNo:true}}}}),
    prisma.admissionEnquiry.count({where:scope}),
    prisma.admissionContactTask.findMany({where:scope,orderBy:[{completedAt:{sort:"asc",nulls:"first"}},{dueAt:"asc"},{id:"asc"}],skip:(taskPage-1)*20,take:20,include:{application:{select:{studentName:true,applicationNo:true}},enquiry:{select:{studentName:true,mobile:true}}}}),
    prisma.admissionContactTask.count({where:scope}),
  ]);
  const overdueIds = new Set((await prisma.admissionContactTask.findMany({ where: { ...scope, id: { in: tasks.map(task => task.id) }, completedAt: null, dueAt: { lt: await requestTime() } }, select: { id: true } })).map(task => task.id));
  const members=staff.map(x=>({id:x.id,name:[x.user.firstName,x.user.lastName].filter(Boolean).join(" ")||x.designation||"School staff",contact:true}));
  return <PageContainer>
    <PageHeader title="Enquiries & follow-ups" description="Capture enquiries before application and manage parent contact." actions={<Button asChild variant="outline"><Link href={`/${schoolSlug}/admissions`}>Back to admissions</Link></Button>}/>
    {manage && <EnquiryForm years={years} classes={classes}/>}
    <section className="space-y-3"><h2 className="font-bold">Enquiries ({enquiryCount})</h2>
      {!enquiries.length && <p className="text-sm text-muted-foreground">No enquiries on this page.</p>}
      {enquiries.map(x=><article key={x.id} className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap justify-between gap-2"><strong>{x.studentName}</strong><span className="text-xs font-bold">{x.state}</span></div>
        <p className="text-sm">{x.academicYear.name} · {x.applyingClass.name} · {x.parentName} · {x.mobile}</p>
        <p className="text-xs text-muted-foreground">{x.source} · {formatSchoolDateTime(x.createdAt)}{x.dob ? " · DOB "+x.dob.toISOString().slice(0,10):""}</p>
        {x.notes && <p className="text-sm">{x.notes}</p>}{x.application && <p className="text-sm">Application: {x.application.applicationNo}</p>}
        {manage && x.state==="OPEN" && <EnquiryActions id={x.id}/>}
        {manage && x.state!=="CLOSED" && <ContactTaskForm target="ENQUIRY" id={x.id} members={members}/>}
      </article>)}
      <nav className="flex gap-3 text-sm">{page>1&&<Link href={`?page=${page-1}&taskPage=${taskPage}`}>Previous enquiries</Link>}{page*20<enquiryCount&&<Link href={`?page=${page+1}&taskPage=${taskPage}`}>Next enquiries</Link>}</nav>
    </section>
    <section className="space-y-3"><h2 className="font-bold">Parent follow-ups ({taskCount})</h2>
      {!tasks.length&&<p className="text-sm text-muted-foreground">No follow-ups on this page.</p>}
      {tasks.map(x=><article key={x.id} className="space-y-2 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap justify-between gap-2"><strong>{x.application?.studentName||x.enquiry?.studentName}</strong><span className="text-xs font-bold">{x.completedAt?"COMPLETED":overdueIds.has(x.id)?"OVERDUE":"OPEN"}</span></div>
        <p className="text-sm">{x.assignedName} · Due {formatSchoolDateTime(x.dueAt)}</p>
        <p className="text-sm">{x.note}</p>
        {x.completedAt&&<p className="text-sm">{x.outcome} · {x.completionNote}</p>}
        {manage&&!x.completedAt&&(admin||actor.id===x.assignedMemberId)&&<CompleteTask id={x.id}/>}
      </article>)}
      <nav className="flex gap-3 text-sm">{taskPage>1&&<Link href={`?page=${page}&taskPage=${taskPage-1}`}>Previous follow-ups</Link>}{taskPage*20<taskCount&&<Link href={`?page=${page}&taskPage=${taskPage+1}`}>Next follow-ups</Link>}</nav>
    </section>
  </PageContainer>;
}

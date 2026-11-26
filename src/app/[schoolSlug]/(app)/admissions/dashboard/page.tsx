import Link from "next/link";
import { PageContainer,PageHeader } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdmissionPanel,AdmissionSelect } from "@/features/admissions/AdmissionWorkspaceUI";
import { isRouteAllowed } from "@/lib/route-access";
import { isMemberRouteAllowed } from "@/lib/navigation-access";
export default async function Page({params,searchParams}:{params:Promise<{schoolSlug:string}>;searchParams:Promise<{year?:string}>}){
 const {schoolSlug}=await params;const query=await searchParams;
 const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"],schoolSlug);
 const admin=["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role);
 const years=await prisma.academicYear.findMany({where:{schoolId:actor.schoolId,admissionsEnabled:true},orderBy:{startDate:"desc"},select:{id:true,name:true}});
 const year=years.find(y=>y.id===query.year)??years[0];
 const cards=[["Smart Pipeline","admissions/pipeline"],["Enquiries","admissions/intake"],["Applications","admissions"],["Age calculator","admissions/age-calculator"],["Admission fees","admissions/fees"],["Entrance & interviews","admissions/reviews"],["Parent follow-ups","admissions/follow-ups"],["Seat capacity","admissions/planning"],["Setup checklist","admissions/setup"],["Admission settings","admissions/settings"]].filter(([,r])=>isRouteAllowed(actor.school,r)&&isMemberRouteAllowed(actor,r)&&(!["admissions/planning","admissions/settings","admissions/setup"].includes(r)||admin));
 const scope={schoolId:actor.schoolId,academicYearId:year?.id??""};
 const counts=admin&&year?await Promise.all([prisma.admissionEnquiry.count({where:{...scope,state:{in:["OPEN","LINKED"]}}}),prisma.admissionApplication.count({where:scope}),prisma.admissionApplication.count({where:{...scope,status:"CONVERTED"}}),prisma.admissionApplication.count({where:{...scope,status:{in:["SUBMITTED","UNDER_REVIEW","WAITLISTED"]}}})]):null;
 return <PageContainer><PageHeader title="Admissions dashboard" description={actor.school.name+" · Admission workspace"}/><section className="premium-hero rounded-3xl p-6"><h2 className="text-xl font-bold">Manage your admissions</h2><p className="mt-2 text-sm text-muted-foreground">Enquiries, eligibility, applications and parent follow-ups in one workspace.</p></section>{year?<form className="premium-card flex flex-wrap items-center gap-2 p-4"><div className="w-full sm:w-56"><AdmissionSelect key={year.id} name="year" label="Academic year" defaultValue={year.id} options={years}/></div><Button type="submit">Apply year</Button></form>:<p className="text-sm text-muted-foreground">No admissions year enabled. Contact your administrator.</p>}{counts&&<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{["Enquiries","Applications","Enrolled","Awaiting review"].map((label,i)=><div key={label} className="premium-card rounded-2xl p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{counts[i]}</p></div>)}</div>}<AdmissionPanel title="Quick actions"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label,route])=><Button key={route} asChild variant="outline" className="h-14 justify-start"><Link href={"/"+schoolSlug+"/"+route+(year?"?year="+encodeURIComponent(year.id):"")}>{label}</Link></Button>)}</div></AdmissionPanel></PageContainer>;
}

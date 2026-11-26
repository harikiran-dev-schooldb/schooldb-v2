import { redirect } from "next/navigation";
import Link from "next/link";
import { isOperationalRole, isSelfServiceRole } from "@/lib/access-control";
import { currentTeacherAccess,requireMembership } from "@/lib/auth";
import { resolveWorkspaceLanding } from "@/lib/navigation-access";
export default async function SchoolEntryPage({params}:{params:Promise<{schoolSlug:string}>}){
 const {schoolSlug}=await params;
 const membership=await requireMembership(schoolSlug);
 if(isSelfServiceRole(membership.role))redirect("/"+schoolSlug+"/my");
 if(!isOperationalRole(membership.role))redirect("/");
 const teacherAccess=membership.role==="TEACHER"?await currentTeacherAccess(membership.schoolId):null;
 const destination=resolveWorkspaceLanding(membership.school,membership,teacherAccess);
 if(destination)redirect("/"+schoolSlug+"/"+destination);
 return <main className="mx-auto max-w-lg space-y-4 p-8"><h1 className="text-2xl font-bold">No workspace access</h1><p className="text-muted-foreground">Your account has no available operational page at {membership.school.name}. Contact your school administrator to request access.</p><Link className="text-primary underline" href="/choose-school">Choose another school</Link>{membership.role==="SUPER_ADMIN"&&<p><Link className="text-primary underline" href={"/"+schoolSlug+"/schools/route-access"}>Manage school route access</Link></p>}</main>;
}

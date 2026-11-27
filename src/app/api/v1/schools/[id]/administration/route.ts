import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { isSchoolSlug } from "@/lib/tenant-context";
import { writeAuditLog } from "@/lib/audit";
import { publicSchoolLogoUrl } from "@/lib/school-branding";
import { validateSchoolProfile } from "@/features/schools/school-profile";

type Props = { params: Promise<{ id: string }> };
const select = { id:true, name:true, slug:true, logo:true, updatedAt:true, administrationProfile:{select:{profile:true}}, routeAccessRestricted:true, allowedRoutes:true, defaultLandingRoute:true, moduleAccessRestricted:true } as const;

async function admin() {
  const actor = await requireRole(["SUPER_ADMIN"]);
  if (actor.role !== "SUPER_ADMIN") throw new ApiError(403,"Super administrator required.");
  return actor;
}
async function snapshot(id: string) {
  const school = await prisma.school.findUnique({where:{id},select});
  if (!school) throw new ApiError(404,"School not found.");
  const [academicYears, history, admissionSettings] = await Promise.all([
    prisma.academicYear.findMany({where:{schoolId:id},orderBy:{startDate:"desc"},select:{id:true,name:true,active:true,admissionsEnabled:true,admissionPublicEnquiriesEnabled:true}}),
    prisma.auditLog.findMany({where:{schoolId:id,entityType:"SchoolConfiguration",entityId:id},orderBy:{createdAt:"desc"},take:50,select:{id:true,actorName:true,actorRole:true,action:true,summary:true,metadata:true,createdAt:true}}),
    prisma.schoolAdmissionSetting.findUnique({where:{schoolId:id},select:{admissionRemindersEnabled:true,admissionEventAlertsEnabled:true}})
  ]);
  return {school:{...school,administrationProfile:school.administrationProfile?.profile??null,logo:publicSchoolLogoUrl(school.slug,school.logo,school.updatedAt)},academicYears,history,admissionSettings};
}
export async function GET(_request:Request,{params}:Props) {
  return apiHandler(async()=>{await admin(); const {id}=await params; return ApiResponse.success(await snapshot(id));});
}
export async function PATCH(request:Request,{params}:Props) {
  return apiHandler(async()=>{
    const actor=await admin(); const {id}=await params; const body=await request.json();
    const name=typeof body.name==="string"?body.name.trim():"";
    if (!name || name.length>200) throw new ApiError(400,"School name must contain 1–200 characters.");
    if (typeof body.updatedAt!=="string" || !Number.isFinite(Date.parse(body.updatedAt))) throw new ApiError(400,"Missing school version.");
    const profile=validateSchoolProfile(body.profile);
    if (profile.requestedSlug) {
      if (profile.requestedSlug.length>80 || !isSchoolSlug(profile.requestedSlug)) throw new ApiError(400,"Proposed URL must use lowercase letters, digits and hyphens and cannot be reserved.");
      const existing=await prisma.school.findUnique({where:{slug:profile.requestedSlug},select:{id:true}});
      if (existing && existing.id!==id) throw new ApiError(409,"That school URL is already in use.");
    }
    await prisma.$transaction(async(tx)=>{
      const current=await tx.school.findUnique({where:{id},select});
      if (!current) throw new ApiError(404,"School not found.");
      const old=validateSchoolProfile(current.administrationProfile?.profile??{});
      const changed=[...new Set([...Object.keys(old),...Object.keys(profile)])].filter(key=>old[key]!==profile[key]);
      if (name!==current.name) changed.push("name");
      const result=await tx.school.updateMany({where:{id,updatedAt:new Date(body.updatedAt)},data:{name}});
      if (result.count!==1) throw new ApiError(409,"School settings changed. Reload before saving.");
      await tx.schoolAdministrationProfile.upsert({where:{schoolId:id},create:{schoolId:id,profile},update:{profile}});
      if (changed.length) await writeAuditLog(tx,{actor:{...actor,schoolId:id},module:"SYSTEM",action:"UPDATE",entityType:"SchoolConfiguration",entityId:id,summary:"Updated school administration profile",metadata:{changedFields:changed}});
    });
    return ApiResponse.success(await snapshot(id),"School settings saved.");
  });
}
export async function POST(_request:Request,{params}:Props) {
  return apiHandler(async()=>{
    const actor=await admin(); const {id}=await params; const data=await snapshot(id);
    await writeAuditLog(prisma,{actor:{...actor,schoolId:id},module:"SYSTEM",action:"EXPORT",entityType:"SchoolConfiguration",entityId:id,summary:"Exported school configuration"});
    return ApiResponse.success({version:1,exportedAt:new Date().toISOString(),school:data.school,academicYears:data.academicYears,admissionSettings:data.admissionSettings});
  });
}

export async function PUT(request:Request,{params}:Props) {
  return apiHandler(async()=>{
    const actor=await admin(); const {id}=await params; const body=await request.json();
    if(typeof body.admissionRemindersEnabled!=="boolean" || typeof body.admissionEventAlertsEnabled!=="boolean") throw new ApiError(400,"Invalid notification settings.");
    await prisma.$transaction(async(tx)=>{
      if(!await tx.school.findUnique({where:{id},select:{id:true}})) throw new ApiError(404,"School not found.");
      const values={admissionRemindersEnabled:body.admissionRemindersEnabled,admissionEventAlertsEnabled:body.admissionEventAlertsEnabled};
      await tx.schoolAdmissionSetting.upsert({where:{schoolId:id},create:{schoolId:id,...values},update:values});
      await writeAuditLog(tx,{actor:{...actor,schoolId:id},module:"ADMISSIONS",action:"UPDATE",entityType:"SchoolConfiguration",entityId:id,summary:"Updated admission alert preferences",metadata:values});
    });
    return ApiResponse.success(await snapshot(id),"Admissions alert settings saved.");
  });
}

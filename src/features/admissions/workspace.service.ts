import { prisma } from "@/lib/prisma";
import { readAdmissionAgePolicy } from "./age-policy.schema";
import { readPlanning } from "./planning-policy";
export async function admissionWorkspaceOptions(schoolId:string) {
  const [years,classes]=await Promise.all([
    prisma.academicYear.findMany({where:{schoolId,active:true},orderBy:{startDate:"desc"},select:{id:true,name:true,admissionAgePolicy:true,admissionPlanning:true,admissionPublicEnquiriesEnabled:true}}),
    prisma.class.findMany({where:{schoolId,active:true},orderBy:[{displayOrder:"asc"},{name:"asc"}],select:{id:true,name:true}}),
  ]);
  return {years:years.map(y=>({id:y.id,name:y.name,policy:readAdmissionAgePolicy(y.admissionAgePolicy),planning:readPlanning(y.admissionPlanning),publicEnabled:y.admissionPublicEnquiriesEnabled})),classes};
}

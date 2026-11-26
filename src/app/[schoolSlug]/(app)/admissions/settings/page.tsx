import { PageContainer,PageHeader } from "@/components/common/layout";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { admissionWorkspaceOptions } from "@/features/admissions/workspace.service";
import { AdmissionAgeSettings } from "@/features/admissions/AdmissionAgeSettings";
import { AdmissionNumberSettings } from "@/features/admissions/AdmissionNumberSettings";
import { AdmissionReminderSetting } from "@/features/admissions/AdmissionLifecycleControls";
import { AdmissionYearSettings } from "@/features/admissions/AdmissionYearSettings";
import { PublicEnquirySetting } from "@/features/admissions/AdmissionPlanningEditor";
export default async function Page({params}:{params:Promise<{schoolSlug:string}>}){const {schoolSlug}=await params;const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN"],schoolSlug);if(!["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role))throw new ApiError(403,"Administrator required.");const [options,setting,allYears]=await Promise.all([admissionWorkspaceOptions(actor.schoolId),prisma.schoolAdmissionSetting.findUnique({where:{schoolId:actor.schoolId}}),prisma.academicYear.findMany({where:{schoolId:actor.schoolId},orderBy:{startDate:"desc"},select:{id:true,name:true,active:true,admissionsEnabled:true}})]);return <PageContainer><PageHeader title="Admission Settings" description="Approved school-specific admission rules."/><AdmissionYearSettings years={allYears}/><AdmissionAgeSettings key={options.years.map(y=>y.id).join(":")} {...options}/><AdmissionNumberSettings initial={{automaticNumbering:setting?.automaticNumbering??false,admissionPrefix:setting?.admissionPrefix??"",nextNumber:setting?.nextNumber??1,numberPadding:setting?.numberPadding??4}}/><PublicEnquirySetting years={options.years}/><AdmissionReminderSetting enabled={setting?.admissionRemindersEnabled??false}/></PageContainer>;}

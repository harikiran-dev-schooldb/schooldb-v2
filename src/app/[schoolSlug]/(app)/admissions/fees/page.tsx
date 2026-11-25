import { PageContainer,PageHeader } from "@/components/common/layout";
import { requireRole } from "@/lib/auth";
import { admissionWorkspaceOptions } from "@/features/admissions/workspace.service";
import { PlanningEditor } from "@/features/admissions/AdmissionPlanningEditor";
export default async function Page({params}:{params:Promise<{schoolSlug:string}>}){const {schoolSlug}=await params;const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"],schoolSlug);const options=await admissionWorkspaceOptions(actor.schoolId);return <PageContainer><PageHeader title="Admission Fee Structure" description="School and year-specific fee quotes."/><PlanningEditor {...options} mode="fees" admin={["SUPER_ADMIN","SCHOOL_ADMIN"].includes(actor.role)} counts={{}}/></PageContainer>;}

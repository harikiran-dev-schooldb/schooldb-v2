import { PageContainer, PageHeader } from "@/components/common/layout";
import { requireRole } from "@/lib/auth";
import { admissionWorkspaceOptions } from "@/features/admissions/workspace.service";
import { AdmissionCalculator } from "@/features/admissions/AdmissionCalculator";
export default async function AgeCalculatorPage({params}:{params:Promise<{schoolSlug:string}>}) {
 const {schoolSlug}=await params;
 const actor=await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"],schoolSlug);
 const options=await admissionWorkspaceOptions(actor.schoolId);
 return <PageContainer><PageHeader title="Age Calculator" description="Calculate exact age, eligible classes and class fee quotes using your school's approved academic-year policy."/><AdmissionCalculator key={options.years.map(y=>y.id).join(':')} {...options}/></PageContainer>;
}

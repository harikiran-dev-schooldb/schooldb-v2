import { PageContainer, PageHeader } from "@/components/common/layout";
import { requireRole } from "@/lib/auth";
import { getOperationsData, type OperationsModule } from "./data";
import { OperationsManager } from "./OperationsManager";

const copy: Record<OperationsModule, { title: string; description: string }> = {
  staff: { title: "Staff attendance & payroll", description: "Manage attendance, imports, leave approvals, salary structures, payroll, payslips and payment status." },
  visitors: { title: "Visitor & gate passes", description: "Check visitors in and out with a searchable, time-stamped gate-pass register." },
  health: { title: "Student health & emergency records", description: "Maintain confidential health profiles and record clinic or first-aid visits." },
  inventory: { title: "Inventory & school assets", description: "Track stock, equipment, condition, location, value and movement history." },
  pickup: { title: "Authorized student pickup", description: "Issue secure, time-bound pickup authorizations and record their use." },
  maintenance: { title: "Maintenance & complaints", description: "Assign, track and resolve facility and equipment maintenance tickets." },
  analytics: { title: "Management analytics", description: "Monitor key operational, financial and safety indicators in one place." },
};

export async function OperationsModulePage({ schoolSlug, module }: { schoolSlug: string; module: OperationsModule }) {
  const roles: Record<OperationsModule, string[]> = {
    staff: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
    visitors: ["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"],
    health: ["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"],
    inventory: ["SUPER_ADMIN", "SCHOOL_ADMIN", "ACCOUNTANT"],
    pickup: ["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"],
    maintenance: ["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"],
    analytics: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
  };
  const membership = await requireRole(roles[module], schoolSlug);
  const data = await getOperationsData(membership.schoolId, module);
  return <PageContainer><PageHeader title={copy[module].title} description={copy[module].description} /><OperationsManager module={module} data={data} /></PageContainer>;
}

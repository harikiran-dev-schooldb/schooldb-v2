import { hasModuleAccess, type StaffPermissionMembership } from "../../lib/staff-permissions.ts";

type WorkflowActor = StaffPermissionMembership & { userId: string };

type WorkflowOwner = {
  confidential: boolean;
  ownerUserId: string | null;
  createdByUserId: string;
};

export function canCreateStrategicWorkflow(actor: WorkflowActor) {
  return hasModuleAccess(actor, "SUPPORT", "MANAGE");
}

export function canUpdateStrategicWorkflow(actor: WorkflowActor, workflow: WorkflowOwner) {
  const isAdmin = actor.role === "SUPER_ADMIN" || actor.role === "SCHOOL_ADMIN";
  if (isAdmin) return true;

  const isParticipant = workflow.ownerUserId === actor.userId || workflow.createdByUserId === actor.userId;
  if (workflow.confidential) return isParticipant;

  return isParticipant || hasModuleAccess(actor, "SUPPORT", "MANAGE");
}

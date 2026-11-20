import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export const AUDIT_MODULES = [
  "STUDENTS",
  "STUDENT_RECORDS",
  "ADMISSIONS",
  "STAFF",
  "ATTENDANCE",
  "FEES",
  "ACADEMICS",
  "HOMEWORK",
  "COMMUNICATION",
  "SYSTEM",
] as const;

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "PUBLISH",
  "ARCHIVE",
  "DELETE",
  "ENABLE",
  "DISABLE",
  "COLLECT",
  "VOID",
  "REFUND_REQUESTED",
  "LOCK",
  "UNLOCK",
  "CORRECT",
  "IMPORT",
  "EXPORT",
  "SEND",
] as const;

export type AuditModule = (typeof AUDIT_MODULES)[number];
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditActor = {
  schoolId: string;
  userId: string;
  role: string;
  designation?: string | null;
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
};

type AuditInput = {
  actor: AuditActor;
  module: AuditModule;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
};

function actorDisplayName(actor: AuditActor) {
  const name = [actor.user.firstName, actor.user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || actor.designation || actor.user.email || "SchoolDB user";
}

export function writeAuditLog(db: Pick<Prisma.TransactionClient, "auditLog">, input: AuditInput) {
  return db.auditLog.create({
    data: {
      schoolId: input.actor.schoolId,
      actorUserId: input.actor.userId,
      actorName: actorDisplayName(input.actor),
      actorRole: input.actor.role,
      module: input.module,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      summary: input.summary,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    },
    select: { id: true },
  });
}

/**
 * Audit logging must never turn a completed business operation into a failed
 * response. Database failures are reported to server logs for monitoring.
 */
export async function recordAuditLog(input: AuditInput) {
  try {
    await writeAuditLog(prisma, input);
  } catch (error) {
    console.error("AUDIT LOG WRITE FAILED", {
      schoolId: input.actor.schoolId,
      module: input.module,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error,
    });
  }
}

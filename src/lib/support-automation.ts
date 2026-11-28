import { z } from "zod";
import { SupportTicketType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { hasModuleAccess } from "@/lib/staff-permissions";

export const supportAutomationSchema = z.object({
  assignments: z.partialRecord(z.enum(SupportTicketType), z.string().trim().min(1).max(120)).default({}),
  escalationEnabled: z.boolean().default(false),
  escalationGraceHours: z.number().int().min(0).max(168).default(0),
  escalationRecipientId: z.string().trim().min(1).max(120).nullable().default(null),
});

export function parseSupportAutomation(value: unknown) {
  const result = supportAutomationSchema.safeParse(value ?? {});
  return result.success ? result.data : supportAutomationSchema.parse({});
}

export async function supportAutoAssignee(tx: Prisma.TransactionClient, schoolId: string, type: SupportTicketType) {
  const school = await tx.school.findUnique({ where: { id: schoolId }, select: { supportAutomation: true } });
  const id = parseSupportAutomation(school?.supportAutomation).assignments[type];
  if (!id) return null;
  const member = await tx.membership.findFirst({
    where: { schoolId, userId: id, isActive: true, role: { notIn: ["PARENT", "STUDENT"] } },
    select: { userId: true, role: true, customPermissionsEnabled: true, permissions: true },
  });
  return member && hasModuleAccess(member, "SUPPORT", "VIEW") ? member.userId : null;
}

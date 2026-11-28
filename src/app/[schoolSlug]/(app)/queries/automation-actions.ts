"use server";

import { revalidatePath } from "next/cache";
import { requireMembership } from "@/lib/auth";
import { isRouteAllowed } from "@/lib/route-access";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { prisma } from "@/lib/prisma";
import { SupportTicketType } from "@/generated/prisma/enums";
import { supportAutomationSchema } from "@/lib/support-automation";

export async function saveSupportAutomation(schoolSlug: string, form: FormData) {
  const member = await requireMembership(schoolSlug);
  if (!["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(member.role) || !isRouteAllowed(member.school, "queries")) throw new Error("Support settings unavailable.");
  const assignments = Object.fromEntries(Object.values(SupportTicketType).flatMap(type => {
    const id = String(form.get(type) ?? "").trim();
    return id ? [[type, id]] : [];
  }));
  const config = supportAutomationSchema.parse({
    assignments,
    escalationEnabled: form.get("escalationEnabled") === "on",
    escalationGraceHours: Number(form.get("escalationGraceHours") ?? 0),
    escalationRecipientId: String(form.get("escalationRecipientId") ?? "").trim() || null,
  });
  const ids = [...new Set([...Object.values(config.assignments), ...(config.escalationRecipientId ? [config.escalationRecipientId] : [])])];
  const staff = await prisma.membership.findMany({
    where: { schoolId: member.schoolId, userId: { in: ids }, isActive: true, role: { notIn: ["PARENT", "STUDENT"] } },
    select: { userId: true, role: true, customPermissionsEnabled: true, permissions: true },
  });
  if (staff.filter(person => hasModuleAccess(person, "SUPPORT", "VIEW")).length !== ids.length) throw new Error("Select active staff with Support access.");
  await prisma.school.update({ where: { id: member.schoolId }, data: { supportAutomation: config } });
  revalidatePath(`/${schoolSlug}/queries`);
}

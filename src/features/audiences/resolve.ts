import { prisma } from "@/lib/prisma";

import type { AudienceType } from "./types";

export async function resolveAudience(
  schoolId: string,
  targetType: AudienceType,
  requestedTargetId: string,
) {
  if (targetType === "SCHOOL") {
    return { targetId: null, targetLabel: "Whole school" };
  }

  if (targetType === "CLASS") {
    const target = await prisma.class.findFirst({
      where: { id: requestedTargetId, schoolId },
      select: { id: true, name: true },
    });
    if (!target) throw new Error("Choose a valid class in this school.");
    return { targetId: target.id, targetLabel: target.name };
  }

  if (targetType === "SECTION") {
    const target = await prisma.section.findFirst({
      where: { id: requestedTargetId, class: { schoolId } },
      select: { id: true, name: true, class: { select: { name: true } } },
    });
    if (!target) throw new Error("Choose a valid section in this school.");
    return {
      targetId: target.id,
      targetLabel: `${target.class.name} ${target.name}`,
    };
  }

  const target = await prisma.student.findFirst({
    where: { id: requestedTargetId, schoolId, status: "ACTIVE" },
    select: { id: true, fullName: true, admissionNo: true },
  });
  if (!target) throw new Error("Choose an active student in this school.");
  return {
    targetId: target.id,
    targetLabel: `${target.fullName || "Student"} (${target.admissionNo})`,
  };
}

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

  if (targetType === "SYLLABUS") {
    const target = await prisma.syllabus.findFirst({
      where: { id: requestedTargetId, schoolId, active: true },
      select: { id: true, name: true },
    });
    if (!target) throw new Error("Choose a valid syllabus in this school.");
    return { targetId: target.id, targetLabel: target.name };
  }

  if (targetType === "BRANCH") {
    const target = await prisma.academicBranch.findFirst({
      where: { id: requestedTargetId, schoolId, active: true },
      select: { id: true, name: true, syllabus: { select: { name: true } } },
    });
    if (!target) throw new Error("Choose a valid academic branch in this school.");
    return {
      targetId: target.id,
      targetLabel: `${target.syllabus.name} · ${target.name}`,
    };
  }

  if (targetType === "CLASS") {
    const target = await prisma.class.findFirst({
      where: { id: requestedTargetId, schoolId },
      select: {
        id: true,
        name: true,
        branch: { select: { name: true, syllabus: { select: { name: true } } } },
      },
    });
    if (!target) throw new Error("Choose a valid class in this school.");
    return {
      targetId: target.id,
      targetLabel: `${target.branch.syllabus.name} · ${target.branch.name} · ${target.name}`,
    };
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

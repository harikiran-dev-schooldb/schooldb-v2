import { after } from "next/server";
import { z } from "zod";

import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";
import {
  processAutomatedCampaign,
  queueHomeworkPublishedAlert,
} from "@/features/whatsapp/automation";

export const publishHomeworkSchema = z.object({
  allocationId: z.string().min(1, "Class and subject are required."),
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid due date."),
});

export function schoolDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireRole(["TEACHER"]);
    const teacher = await requireCurrentTeacher(membership.schoolId);

    const [allocations, items] = await Promise.all([
      prisma.teacherAllocation.findMany({
        where: {
          schoolId: membership.schoolId,
          teacherId: teacher.id,
          active: true,
          academicYear: { active: true },
        },
        distinct: ["academicYearId", "classId", "sectionId", "subjectId"],
        orderBy: [
          { class: { name: "asc" } },
          { section: { name: "asc" } },
          { subject: { name: "asc" } },
        ],
        select: {
          id: true,
          academicYearId: true,
          classId: true,
          sectionId: true,
          subjectId: true,
          class: { select: { name: true } },
          section: { select: { name: true } },
          subject: { select: { name: true } },
        },
      }),
      prisma.homework.findMany({
        where: { schoolId: membership.schoolId, teacherId: teacher.id },
        take: 30,
        orderBy: [{ assignedDate: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          description: true,
          assignedDate: true,
          dueDate: true,
          active: true,
          academicYearId: true,
          classId: true,
          sectionId: true,
          subjectId: true,
          class: { select: { name: true } },
          section: { select: { name: true } },
          subject: { select: { name: true } },
        },
      }),
    ]);

    return ApiResponse.success({
      allocations,
      items: items.map((item) => ({
        ...item,
        allocationId:
          allocations.find(
            (allocation) =>
              allocation.academicYearId === item.academicYearId &&
              allocation.classId === item.classId &&
              allocation.sectionId === item.sectionId &&
              allocation.subjectId === item.subjectId,
          )?.id ?? null,
      })),
    });
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["TEACHER"]);
    const teacher = await requireCurrentTeacher(membership.schoolId);
    const body = await validateBody(req, publishHomeworkSchema);
    const allocation = await prisma.teacherAllocation.findFirst({
      where: {
        id: body.allocationId,
        schoolId: membership.schoolId,
        teacherId: teacher.id,
        active: true,
        academicYear: { active: true },
      },
      select: {
        academicYearId: true,
        classId: true,
        sectionId: true,
        subjectId: true,
      },
    });

    if (!allocation) throw new Error("This class and subject are not assigned to you.");

    const assignedDate = new Date(`${schoolDate()}T00:00:00.000Z`);
    const dueDate = new Date(`${body.dueDate}T00:00:00.000Z`);
    if (Number.isNaN(dueDate.getTime()) || dueDate < assignedDate) {
      throw new Error("Due date cannot be before today.");
    }

    const item = await prisma.homework.create({
      data: {
        schoolId: membership.schoolId,
        academicYearId: allocation.academicYearId,
        teacherId: teacher.id,
        subjectId: allocation.subjectId,
        classId: allocation.classId,
        sectionId: allocation.sectionId,
        title: body.title,
        description: body.description || null,
        assignedDate,
        dueDate,
        active: true,
      },
      select: { id: true, title: true },
    });

    const campaign = await queueHomeworkPublishedAlert(membership.schoolId, item.id);
    if (campaign) after(() => processAutomatedCampaign(campaign.id));
    await recordAuditLog({
      actor: membership,
      module: "HOMEWORK",
      action: "PUBLISH",
      entityType: "HOMEWORK",
      entityId: item.id,
      summary: `Published homework: ${item.title}.`,
    });

    return ApiResponse.success(item, "Homework published successfully.", 201);
  });
}

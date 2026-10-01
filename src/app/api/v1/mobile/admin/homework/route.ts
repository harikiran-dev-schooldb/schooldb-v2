import { z } from "zod";

import { homeworkService } from "@/features/homework/services/homework.service";
import { notifyHomeworkPublished } from "@/features/notifications/events";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

const createHomeworkSchema = z.object({
  classId: z.string().min(1, "Class is required."),
  sectionId: z.string().optional().default(""),
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid due date."),
});

function schoolDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = await validateBody(req, createHomeworkSchema);
    const item = await homeworkService.create(membership.schoolId, {
      classId: body.classId,
      sectionId: body.sectionId,
      title: body.title,
      description: body.description,
      dueDate: `${body.dueDate}T00:00:00.000Z`,
      assignedDate: `${schoolDate()}T00:00:00.000Z`,
      active: true,
    });

    await notifyHomeworkPublished(item.id, membership.schoolId);
    await recordAuditLog({
      actor: membership,
      module: "HOMEWORK",
      action: "PUBLISH",
      entityType: "HOMEWORK",
      entityId: item.id,
      summary: `Published homework: ${item.title}.`,
    });

    return ApiResponse.success(
      { id: item.id },
      "Homework published successfully.",
      201,
    );
  });
}

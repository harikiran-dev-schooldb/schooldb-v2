import { z } from "zod";

import { resolveAudience } from "@/features/audiences/resolve";
import { sendAnnouncementPush } from "@/features/notifications/push";
import { requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(10000),
  category: z.enum(["GENERAL", "FEES", "EXAM", "HOMEWORK", "ATTENDANCE", "EMERGENCY"]),
  priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]),
  targetType: z.enum(["SCHOOL", "SYLLABUS", "BRANCH", "CLASS", "SECTION"]),
  targetId: z.string().trim().max(100).default(""),
});

export async function POST(req: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = await validateBody(req, createAnnouncementSchema);
    const audience = await resolveAudience(
      membership.schoolId,
      body.targetType,
      body.targetId,
    );
    const announcement = await prisma.announcement.create({
      data: {
        schoolId: membership.schoolId,
        createdBy: membership.userId,
        title: body.title,
        body: body.body,
        category: body.category,
        priority: body.priority,
        targetType: body.targetType,
        targetId: audience.targetId,
        targetLabel: audience.targetLabel,
        publishedAt: new Date(),
      },
    });

    await recordAuditLog({
      actor: membership,
      module: "COMMUNICATION",
      action: "PUBLISH",
      entityType: "ANNOUNCEMENT",
      entityId: announcement.id,
      summary: `Published announcement “${announcement.title}” to ${announcement.targetLabel}.`,
    });
    await sendAnnouncementPush(announcement);

    return ApiResponse.success(
      { id: announcement.id },
      "Announcement published successfully.",
      201,
    );
  });
}

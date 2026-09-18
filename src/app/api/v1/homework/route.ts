import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import {
  requireRole,
  requireCurrentTeacher,
  requireTeacherClassSection,
  requireTenant,
} from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { after } from "next/server";

import { homeworkSchema } from "@/features/homework/schemas/homework.schema";
import { homeworkService } from "@/features/homework/services/homework.service";
import {
  processAutomatedCampaign,
  queueHomeworkPublishedAlert,
} from "@/features/whatsapp/automation";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]);
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 25);
    const search = searchParams.get("search") ?? undefined;
    const teacherScope = tenant.role === "TEACHER"
      ? await requireCurrentTeacher(tenant.schoolId).then((teacher) =>
          prisma.teacherAllocation.findMany({
            where: { schoolId: tenant.schoolId, teacherId: teacher.id, active: true },
            distinct: ["classId", "sectionId"],
            select: { classId: true, sectionId: true },
          }),
        )
      : undefined;
    const homework = await homeworkService.list(tenant.schoolId, {
      page,
      pageSize,
      search,
      teacherScope,
    });
    return ApiResponse.success(homework);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "TEACHER",
    ]);
    const body = await validateBody(req, homeworkSchema);

    await requireTeacherClassSection(body.classId, body.sectionId || undefined);

    const item = await homeworkService.create(tenant.schoolId, body);
    if (item.active) {
      const campaign = await queueHomeworkPublishedAlert(
        tenant.schoolId,
        item.id,
      );
      if (campaign) after(() => processAutomatedCampaign(campaign.id));
    }
    await recordAuditLog({
      actor: tenant,
      module: "HOMEWORK",
      action: item.active ? "PUBLISH" : "CREATE",
      entityType: "HOMEWORK",
      entityId: item.id,
      summary: `${item.active ? "Published" : "Created draft"} homework: ${item.title}.`,
    });
    return ApiResponse.success(item, "Homework created successfully.", 201);
  });
}

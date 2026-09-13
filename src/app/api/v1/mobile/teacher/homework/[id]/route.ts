import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";
import { publishHomeworkSchema } from "../route";

type Props = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Props) {
  return apiHandler(async () => {
    const membership = await requireRole(["TEACHER"]);
    const teacher = await requireCurrentTeacher(membership.schoolId);
    const { id } = await params;
    const body = await validateBody(req, publishHomeworkSchema);

    const [homework, allocation] = await Promise.all([
      prisma.homework.findFirst({
        where: { id, schoolId: membership.schoolId, teacherId: teacher.id },
        select: { id: true, assignedDate: true },
      }),
      prisma.teacherAllocation.findFirst({
        where: {
          id: body.allocationId,
          schoolId: membership.schoolId,
          teacherId: teacher.id,
          active: true,
          academicYear: { active: true },
        },
        select: { academicYearId: true, classId: true, sectionId: true, subjectId: true },
      }),
    ]);

    if (!homework) throw new Error("Homework not found or not owned by this teacher.");
    if (!allocation) throw new Error("This class and subject are not assigned to you.");

    const dueDate = new Date(`${body.dueDate}T00:00:00.000Z`);
    if (Number.isNaN(dueDate.getTime()) || dueDate < homework.assignedDate) {
      throw new Error("Due date cannot be before the assigned date.");
    }

    const item = await prisma.homework.update({
      where: { id: homework.id },
      data: {
        academicYearId: allocation.academicYearId,
        classId: allocation.classId,
        sectionId: allocation.sectionId,
        subjectId: allocation.subjectId,
        title: body.title,
        description: body.description || null,
        dueDate,
      },
      select: { id: true, title: true },
    });

    await recordAuditLog({
      actor: membership,
      module: "HOMEWORK",
      action: "UPDATE",
      entityType: "HOMEWORK",
      entityId: item.id,
      summary: `Updated homework: ${item.title}.`,
    });

    return ApiResponse.success(item, "Homework updated successfully.");
  });
}

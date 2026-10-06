import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { notifyHomeworkPublished } from "@/features/notifications/events";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";
import { publishHomeworkSchema, schoolDate } from "@/features/homework/mobile-teacher-homework";

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireRole(["TEACHER"]);
    const teacher = await requireCurrentTeacher(membership.schoolId);

    const [subjectAllocations, classAssignments, items] = await Promise.all([
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
      prisma.classTeacherAssignment.findMany({
        where: {
          schoolId: membership.schoolId,
          teacherId: teacher.id,
          active: true,
          academicYear: { active: true },
        },
        distinct: ["academicYearId", "classId", "sectionId"],
        orderBy: [
          { class: { name: "asc" } },
          { section: { name: "asc" } },
        ],
        select: {
          id: true,
          academicYearId: true,
          classId: true,
          sectionId: true,
          class: { select: { name: true } },
          section: { select: { name: true } },
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

    const allocations = [
      ...subjectAllocations.map((allocation) => ({
        ...allocation,
        allocationType: "SUBJECT" as const,
      })),
      ...classAssignments.map((assignment) => ({
        ...assignment,
        subjectId: null,
        subject: { name: "Class teacher" },
        allocationType: "CLASS_TEACHER" as const,
      })),
    ];

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

    const classAssignment = allocation
      ? null
      : await prisma.classTeacherAssignment.findFirst({
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
          },
        });

    if (!allocation && !classAssignment) {
      throw new Error("This class or subject is not assigned to you.");
    }
    const target = allocation ?? classAssignment!;

    const assignedDate = new Date(`${schoolDate()}T00:00:00.000Z`);
    const dueDate = new Date(`${body.dueDate}T00:00:00.000Z`);
    if (Number.isNaN(dueDate.getTime()) || dueDate < assignedDate) {
      throw new Error("Due date cannot be before today.");
    }

    const item = await prisma.homework.create({
      data: {
        schoolId: membership.schoolId,
        academicYearId: target.academicYearId,
        teacherId: teacher.id,
        subjectId: allocation?.subjectId ?? null,
        classId: target.classId,
        sectionId: target.sectionId,
        title: body.title,
        description: body.description || null,
        assignedDate,
        dueDate,
        active: true,
      },
      select: { id: true, title: true },
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

    return ApiResponse.success(item, "Homework published successfully.", 201);
  });
}

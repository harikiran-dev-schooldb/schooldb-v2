import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { supportActor } from "@/lib/support-tickets";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const actor = await supportActor();
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return ApiResponse.success([]);
    const students = await prisma.student.findMany({
      where: {
        schoolId: actor.schoolId,
        OR: [
          { admissionNo: { contains: q, mode: "insensitive" } },
          { fullName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true, admissionNo: true, fullName: true,
        enrollments: {
          where: { active: true }, take: 1,
          select: { class: { select: { name: true } }, section: { select: { name: true } } },
        },
      },
      take: 20,
      orderBy: { fullName: "asc" },
    });
    return ApiResponse.success(students.map((student) => ({
      id: student.id,
      admissionNo: student.admissionNo,
      fullName: student.fullName ?? "Student",
      className: student.enrollments[0]?.class.name ?? null,
      sectionName: student.enrollments[0]?.section.name ?? null,
    })));
  });
}

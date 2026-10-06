import { attendanceService } from "@/features/attendance/services/attendance.service";
import { getFeeDashboard } from "@/features/fees/services/fee-dashboard.service";
import { outstandingFeesService } from "@/features/fees/services/outstanding-fees.service";
import { getBirthdaySummary } from "@/features/students/services/birthday-summary.service";
import { hasPermission, PERMISSIONS } from "@/lib/access-control";
import { apiHandler } from "@/lib/api";
import { requireCurrentTeacher, requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"];

export async function GET(request: Request) {
  return apiHandler(async () => {
    const startedAt = Date.now();
    const membership = await requireTenant();
    const { schoolId, role } = membership;
    const canReadAttendance = hasPermission(role, PERMISSIONS.ATTENDANCE_READ);
    const canReadFees = hasPermission(role, PERMISSIONS.FEE_READ);
    const canReadStaff = hasPermission(role, PERMISSIONS.STAFF_READ);
    const isAdministrator = ADMIN_ROLES.includes(role);

    const [academicYear, teacherScope] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { schoolId, active: true },
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, active: true },
      }),
      role === "TEACHER"
        ? requireCurrentTeacher(schoolId).then((teacher) =>
            prisma.teacherAllocation.findMany({
              where: { schoolId, teacherId: teacher.id, active: true },
              distinct: ["classId", "sectionId"],
              select: { classId: true, sectionId: true },
            }),
          )
        : Promise.resolve(null),
    ]);

    const academicYearId = academicYear?.id;
    const [
      students,
      teachers,
      classes,
      attendance,
      fees,
      outstanding,
      houses,
      birthdaySummary,
    ] = await Promise.all([
      prisma.student.count({
        where: {
          schoolId,
          status: "ACTIVE",
          ...(teacherScope
            ? {
                enrollments: {
                  some: {
                    active: true,
                    OR: teacherScope.map((scope) => ({
                      classId: scope.classId,
                      sectionId: scope.sectionId,
                    })),
                  },
                },
              }
            : {}),
        },
      }),
      canReadStaff ? prisma.teacher.count({ where: { schoolId } }) : 0,
      prisma.class.count({ where: { schoolId, active: true } }),
      canReadAttendance ? attendanceService.dashboard(schoolId) : null,
      canReadFees ? getFeeDashboard(schoolId, academicYearId) : null,
      canReadFees
        ? outstandingFeesService.summary({ schoolId, academicYearId })
        : null,
      prisma.house.findMany({
        where: { schoolId },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          code: true,
          color: true,
          _count: {
            select: {
              students: academicYearId
                ? { where: { academicYearId, student: { status: "ACTIVE" } } }
                : { where: { student: { status: "ACTIVE" } } },
            },
          },
        },
      }),
      isAdministrator
        ? getBirthdaySummary(schoolId)
        : Promise.resolve({ birthdays: [], total: 0 }),
    ]);

    console.info(
      JSON.stringify({
        level: "info",
        message: "Dashboard loaded",
        route: "/api/v1/dashboard",
        requestId: request.headers.get("x-vercel-id"),
        schoolId,
        role,
        durationMs: Date.now() - startedAt,
      }),
    );

    return ApiResponse.success({
      academicYear,
      students,
      teachers,
      classes,
      attendance,
      fees,
      lowAttendance: [],
      lowAttendanceCount: attendance?.alerts.lowAttendanceCount ?? 0,
      outstanding: [],
      outstandingCount: outstanding?.installmentCount ?? 0,
      outstandingAmount: outstanding?.outstanding ?? 0,
      houses,
      birthdays: birthdaySummary.birthdays,
    });
  });
}

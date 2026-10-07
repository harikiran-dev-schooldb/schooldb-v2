import { attendanceService } from "@/features/attendance/services/attendance.service";
import { getFeeDashboard } from "@/features/fees/services/fee-dashboard.service";
import { outstandingFeesService } from "@/features/fees/services/outstanding-fees.service";
import { getBirthdaySummary } from "@/features/students/services/birthday-summary.service";
import { apiHandler } from "@/lib/api";
import { requireCurrentTeacher, requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { hasModuleAccess } from "@/lib/staff-permissions";

const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"];

export async function GET(request: Request) {
  return apiHandler(async () => {
    const startedAt = Date.now();
    const now = new Date();
    const indiaDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const today = new Date(`${indiaDate}T00:00:00.000Z`);
    const membership = await requireTenant();
    const { schoolId, role } = membership;
    const canReadAttendance = hasModuleAccess(membership, "ATTENDANCE");
    const canReadFees = hasModuleAccess(membership, "FEES");
    const canReadStaff = hasModuleAccess(membership, "STAFF");
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
      pendingAdmissions,
      pendingStudentLeaves,
      pendingStaffLeaves,
      pendingUpiPayments,
      openSupportTickets,
      overdueLibraryLoans,
      staffAttendanceExceptions,
      transportRoutes,
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
      canReadStaff ? prisma.teacher.count({ where: { schoolId, active: true } }) : 0,
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
      isAdministrator
        ? prisma.admissionApplication.count({
            where: { schoolId, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
          })
        : 0,
      isAdministrator
        ? prisma.leaveRequest.count({
            where: { schoolId, status: "PENDING", student: { status: "ACTIVE" } },
          })
        : 0,
      isAdministrator
        ? prisma.staffLeaveRequest.count({ where: { schoolId, status: "PENDING" } })
        : 0,
      canReadFees
        ? prisma.directUpiPaymentSubmission.count({
            where: {
              schoolId,
              status: "PENDING",
              studentEnrollment: { student: { status: "ACTIVE" } },
            },
          })
        : 0,
      isAdministrator
        ? prisma.supportTicket.count({
            where: {
              schoolId,
              status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING", "REOPENED"] },
            },
          })
        : 0,
      isAdministrator
        ? prisma.libraryLoan.count({
            where: { schoolId, returnedAt: null, dueAt: { lt: today } },
          })
        : 0,
      canReadStaff
        ? prisma.staffAttendance.count({
            where: {
              schoolId,
              date: today,
              status: { not: "PRESENT" },
              teacher: { active: true },
            },
          })
        : 0,
      isAdministrator
        ? prisma.transportRoute.findMany({
            where: { schoolId, active: true, vehicle: { is: { active: true } } },
            select: {
              id: true,
              vehicle: { select: { capacity: true } },
              _count: {
                select: {
                  assignments: {
                    where: {
                      active: true,
                      studentEnrollment: { active: true, student: { status: "ACTIVE" } },
                    },
                  },
                },
              },
            },
          })
        : [],
    ]);

    const overCapacityRoutes = transportRoutes.filter(
      (route) => route.vehicle && route._count.assignments > route.vehicle.capacity,
    ).length;

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
      dataAsOf: now.toISOString(),
      actions: {
        pendingAdmissions,
        pendingStudentLeaves,
        pendingStaffLeaves,
        pendingUpiPayments,
        openSupportTickets,
        overdueLibraryLoans,
        staffAttendanceExceptions,
        overCapacityRoutes,
      },
    });
  });
}

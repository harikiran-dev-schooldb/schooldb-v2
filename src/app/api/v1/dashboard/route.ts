import { attendanceService } from "@/features/attendance/services/attendance.service";
import { unstable_cache } from "next/cache";
import { getFeeDashboard } from "@/features/fees/services/fee-dashboard.service";
import { outstandingFeesService } from "@/features/fees/services/outstanding-fees.service";
import { getAnalyticsSettings } from "@/features/reports/analytics-settings";
import { getBirthdaySummary } from "@/features/students/services/birthday-summary.service";
import { apiHandler } from "@/lib/api";
import { createAsyncTtlCache } from "@/lib/async-ttl-cache";
import { requireCurrentTeacher, requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { hasModuleAccess } from "@/lib/staff-permissions";

const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"];
const DASHBOARD_CACHE_TTL_MS = 15_000;

type DashboardCacheInput = {
  schoolId: string;
  role: string;
  canReadAttendance: boolean;
  canReadFees: boolean;
  canReadStaff: boolean;
  isAdministrator: boolean;
  teacherScope: Array<{ classId: string; sectionId: string }> | null;
};

async function loadDashboardData({
  schoolId,
  canReadAttendance,
  canReadFees,
  canReadStaff,
  isAdministrator,
  teacherScope,
}: DashboardCacheInput) {
    const now = new Date();
    const indiaDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const today = new Date(`${indiaDate}T00:00:00.000Z`);
    const [academicYear, analyticsSettings] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { schoolId, active: true },
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, active: true },
      }),
      getAnalyticsSettings(schoolId),
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
      canReadAttendance
        ? attendanceService.dashboard(schoolId, {
            threshold: analyticsSettings.lowAttendanceThreshold,
            lateCountsAsPresent: analyticsSettings.lateCountsAsPresent,
          })
        : null,
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
      (route) =>
        route.vehicle &&
        route.vehicle.capacity > 0 &&
        (route._count.assignments / route.vehicle.capacity) * 100 >=
          analyticsSettings.routeCapacityWarningPercent,
    ).length;

    return {
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
      analyticsSettings,
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
    };
}

type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>;
const dashboardCache = createAsyncTtlCache<DashboardData>({
  ttlMs: DASHBOARD_CACHE_TTL_MS,
  maxEntries: 500,
});

function loadPersistedDashboard(key: string, input: DashboardCacheInput) {
  return unstable_cache(
    () => loadDashboardData(input),
    ["dashboard-data-v1", key],
    { revalidate: DASHBOARD_CACHE_TTL_MS / 1_000 },
  )();
}

function dashboardCacheKey(input: DashboardCacheInput) {
  const teacherScope = input.teacherScope
    ? [...input.teacherScope].sort((left, right) =>
        `${left.classId}:${left.sectionId}`.localeCompare(
          `${right.classId}:${right.sectionId}`,
        ),
      )
    : null;

  return JSON.stringify({ ...input, teacherScope });
}

export async function GET(request: Request) {
  return apiHandler(async () => {
    const startedAt = Date.now();
    const membership = await requireTenant();
    const { schoolId, role } = membership;
    const teacherScope = role === "TEACHER"
      ? await requireCurrentTeacher(schoolId).then((teacher) =>
          prisma.teacherAllocation.findMany({
            where: { schoolId, teacherId: teacher.id, active: true },
            distinct: ["classId", "sectionId"],
            select: { classId: true, sectionId: true },
          }),
        )
      : null;
    const cacheInput: DashboardCacheInput = {
      schoolId,
      role,
      canReadAttendance: hasModuleAccess(membership, "ATTENDANCE"),
      canReadFees: hasModuleAccess(membership, "FEES"),
      canReadStaff: hasModuleAccess(membership, "STAFF"),
      isAdministrator: ADMIN_ROLES.includes(role),
      teacherScope,
    };
    const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
    const cacheKey = dashboardCacheKey(cacheInput);
    const data = await dashboardCache.get(
      cacheKey,
      () => forceRefresh
        ? loadDashboardData(cacheInput)
        : loadPersistedDashboard(cacheKey, cacheInput),
      { force: forceRefresh },
    );

    console.info(
      JSON.stringify({
        level: "info",
        message: "Dashboard loaded",
        route: "/api/v1/dashboard",
        requestId: request.headers.get("x-vercel-id"),
        schoolId,
        role,
        forceRefresh,
        durationMs: Date.now() - startedAt,
      }),
    );

    return ApiResponse.success(data);
  });
}

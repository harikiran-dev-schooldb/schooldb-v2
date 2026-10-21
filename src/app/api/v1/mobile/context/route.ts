import { currentTeacherAccess, requireMembership } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { canUnlockAttendance } from "@/features/attendance/policy";
import { publicSchoolLogoUrl } from "@/lib/school-branding";
import {
  hasModuleAccess,
  STAFF_PERMISSION_MODULES,
} from "@/lib/staff-permissions";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const membership = await requireMembership();
    const fullName = [membership.user.firstName, membership.user.lastName]
      .filter(Boolean)
      .join(" ");
    const access = membership.role === "TEACHER"
      ? await currentTeacherAccess(membership.schoolId)
      : null;
    const schoolLogoPath = publicSchoolLogoUrl(
      membership.school.slug,
      membership.school.logo,
      membership.school.updatedAt,
    );

    return ApiResponse.success({
      userName: fullName || membership.user.email,
      schoolName: membership.school.name,
      schoolLogoUrl: schoolLogoPath
        ? new URL(schoolLogoPath, request.url).toString()
        : null,
      schoolSlug: membership.school.slug,
      role: membership.role,
      designation: membership.designation,
      phone: membership.user.phone,
      email: membership.user.email,
      imageUrl: membership.user.imageUrl,
      permissions: {
        canUnlockAttendance: canUnlockAttendance(
          membership.role,
          membership.designation,
        ),
      },
      teacherAccess: access
        ? {
            students: access.studentDetailsAccess,
            fees: access.feeAccess,
            results: access.resultAccess,
            timetable: access.timetableAccess,
            attendance: access.attendanceAccess,
            homework: access.homeworkAccess,
            exams: access.examAccess,
            marksEntry: access.marksEntryAccess,
          }
        : null,
      staffModules: STAFF_PERMISSION_MODULES
        .filter((module) => hasModuleAccess(membership, module.key, "VIEW"))
        .map((module) => module.key),
      staffManagedModules: STAFF_PERMISSION_MODULES
        .filter((module) => hasModuleAccess(membership, module.key, "MANAGE"))
        .map((module) => module.key),
    });
  });
}

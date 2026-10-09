import { currentTeacherAccess, requireMembership } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireMembership();
    const fullName = [membership.user.firstName, membership.user.lastName]
      .filter(Boolean)
      .join(" ");
    const access = membership.role === "TEACHER"
      ? await currentTeacherAccess(membership.schoolId)
      : null;

    return ApiResponse.success({
      userName: fullName || membership.user.email,
      schoolName: membership.school.name,
      schoolSlug: membership.school.slug,
      role: membership.role,
      designation: membership.designation,
      phone: membership.user.phone,
      email: membership.user.email,
      imageUrl: membership.user.imageUrl,
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
    });
  });
}

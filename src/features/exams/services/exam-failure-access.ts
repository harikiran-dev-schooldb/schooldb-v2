import {
  classTeacherScope,
  requireRole,
  requireTeacherFeatureAccess,
  teacherAllocationScope,
} from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { isRouteAllowed } from "@/lib/route-access";
import type { ExamTeacherAssignment } from "../exam-teacher-scope";

export async function requireExamFailureAccess() {
  const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"]);
  if (!isRouteAllowed(tenant.school, "failures")) {
    throw new ApiError(403, "The Failures report is not enabled for this school.");
  }

  let teacherScope: ExamTeacherAssignment[] | undefined;
  if (tenant.role === "TEACHER") {
    await requireTeacherFeatureAccess("RESULTS");
    const [subjectAssignments, classAssignments] = await Promise.all([
      teacherAllocationScope(tenant.schoolId),
      classTeacherScope(tenant.schoolId),
    ]);
    teacherScope = [...subjectAssignments, ...classAssignments];
  }

  return { schoolId: tenant.schoolId, teacherScope };
}

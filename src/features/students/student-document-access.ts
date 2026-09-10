import { hasPermission, isOperationalRole, PERMISSIONS } from "@/lib/access-control";
import { requireMembership } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireStudentAccess } from "@/lib/student-access";

export async function requireStudentDocumentAccess(studentId: string) {
  const membership = await requireMembership();

  if (isOperationalRole(membership.role)) {
    if (!hasPermission(membership.role, PERMISSIONS.STUDENT_PRIVATE_READ)) {
      throw new ApiError(403, "You do not have permission to access private student documents");
    }
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: membership.schoolId },
      select: { id: true },
    });
    if (!student) throw new ApiError(404, "Student not found");
    return { membership, familyOnly: false };
  }

  await requireStudentAccess(membership.school.slug, studentId);
  return { membership, familyOnly: true };
}

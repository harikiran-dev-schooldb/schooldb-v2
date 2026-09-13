import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const membership = await requireRole(["TEACHER"]);
    const teacher = await requireCurrentTeacher(membership.schoolId);

    const allocations = await prisma.teacherAllocation.findMany({
      where: {
        schoolId: membership.schoolId,
        teacherId: teacher.id,
        active: true,
        academicYear: { active: true },
      },
      orderBy: [
        { class: { displayOrder: "asc" } },
        { section: { displayOrder: "asc" } },
        { subject: { displayOrder: "asc" } },
      ],
      select: {
        classId: true,
        sectionId: true,
        subjectId: true,
        class: { select: { name: true } },
        section: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    const classKeys = new Set(
      allocations.map((item) => `${item.classId}:${item.sectionId}`),
    );
    const subjectIds = new Set(allocations.map((item) => item.subjectId));

    return ApiResponse.success({
      schoolName: membership.school.name,
      teacher: {
        id: teacher.id,
        employeeId: teacher.employeeId,
        fullName: teacher.fullName,
        gender: teacher.gender,
        dob: teacher.dob,
        joiningDate: teacher.joiningDate,
        phone: teacher.phone,
        alternatePhone: teacher.alternatePhone,
        email: teacher.email,
        qualification: teacher.qualification,
        designation: teacher.designation,
        experience: teacher.experience,
        bloodGroup: teacher.bloodGroup,
        imageUrl: teacher.imageUrl,
        address: teacher.address,
        city: teacher.city,
        district: teacher.district,
        state: teacher.state,
        pincode: teacher.pincode,
      },
      summary: {
        classCount: classKeys.size,
        subjectCount: subjectIds.size,
      },
      allocations: allocations.map((item) => ({
        className: item.class.name,
        sectionName: item.section.name,
        subjectName: item.subject.name,
      })),
    });
  });
}

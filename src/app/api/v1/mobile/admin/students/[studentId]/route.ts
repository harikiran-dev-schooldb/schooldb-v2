import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export async function GET(
  _request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { studentId } = await context.params;
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: membership.schoolId },
      select: {
        id: true,
        fullName: true,
        admissionNo: true,
        status: true,
        gender: true,
        dob: true,
        joinedDate: true,
        bloodGroup: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        fatherName: true,
        fatherPhone: true,
        motherName: true,
        motherPhone: true,
        guardianName: true,
        guardianPhone: true,
        guardianRelation: true,
        medicalConditions: true,
        allergies: true,
        transportRequired: true,
        hostelRequired: true,
        parentLinks: {
          where: { active: true },
          select: {
            relationship: true,
            parentUser: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        enrollments: {
          where: { active: true },
          orderBy: [{ academicYear: { startDate: "desc" } }, { createdAt: "desc" }],
          take: 1,
          select: {
            id: true,
            rollNo: true,
            admissionDate: true,
            academicYearId: true,
            academicYear: { select: { name: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
            houseAssignment: { select: { house: { select: { name: true, color: true } } } },
          },
        },
      },
    });

    if (!student) return ApiResponse.error("Student not found.", 404);
    const enrollment = student.enrollments[0] ?? null;

    const [attendance, installments, marks] = enrollment
      ? await Promise.all([
          prisma.attendance.groupBy({
            by: ["status"],
            where: {
              schoolId: membership.schoolId,
              studentId,
              session: { academicYearId: enrollment.academicYearId },
            },
            _count: { _all: true },
          }),
          prisma.studentFeeInstallment.findMany({
            where: {
              studentFeeItem: {
                studentFee: {
                  schoolId: membership.schoolId,
                  studentEnrollmentId: enrollment.id,
                  active: true,
                },
              },
            },
            select: { payableAmount: true, paidAmount: true, status: true },
          }),
          prisma.studentExamMark.findMany({
            where: { schoolId: membership.schoolId, studentEnrollmentId: enrollment.id },
            orderBy: { updatedAt: "desc" },
            take: 8,
            select: {
              id: true,
              marksObtained: true,
              status: true,
              examSchedule: {
                select: {
                  maxMarks: true,
                  passMarks: true,
                  subject: { select: { name: true } },
                  exam: { select: { name: true } },
                },
              },
            },
          }),
        ])
      : [[], [], []];

    const attendanceCounts = Object.fromEntries(
      attendance.map((item) => [item.status.toLowerCase(), item._count._all]),
    );
    const totalAttendance = attendance.reduce((sum, item) => sum + item._count._all, 0);
    const attended = (attendanceCounts.present ?? 0) + (attendanceCounts.late ?? 0);
    const payable = installments.reduce((sum, item) => sum + Number(item.payableAmount), 0);
    const paid = installments.reduce((sum, item) => sum + Number(item.paidAmount), 0);

    return ApiResponse.success({
      student: {
        ...student,
        enrollments: undefined,
        parentLinks: undefined,
        dob: student.dob.toISOString().slice(0, 10),
        joinedDate: student.joinedDate?.toISOString().slice(0, 10) ?? null,
      },
      enrollment: enrollment
        ? {
            id: enrollment.id,
            className: enrollment.class.name,
            sectionName: enrollment.section.name,
            academicYear: enrollment.academicYear.name,
            rollNo: enrollment.rollNo,
            admissionDate: enrollment.admissionDate?.toISOString().slice(0, 10) ?? null,
            houseName: enrollment.houseAssignment?.house.name ?? null,
            houseColor: enrollment.houseAssignment?.house.color ?? null,
          }
        : null,
      parents: [
        ...(student.fatherName || student.fatherPhone
          ? [{ name: student.fatherName || "Father", phone: student.fatherPhone, relationship: "Father" }]
          : []),
        ...(student.motherName || student.motherPhone
          ? [{ name: student.motherName || "Mother", phone: student.motherPhone, relationship: "Mother" }]
          : []),
        ...(student.guardianName || student.guardianPhone
          ? [{ name: student.guardianName || "Guardian", phone: student.guardianPhone,
              relationship: student.guardianRelation || "Guardian" }]
          : []),
        ...student.parentLinks.map((link) => ({
          name: [link.parentUser.firstName, link.parentUser.lastName].filter(Boolean).join(" ") || "Parent",
          phone: link.parentUser.phone,
          email: link.parentUser.email,
          relationship: link.relationship || "Parent",
        })),
      ].filter((parent, index, rows) =>
        rows.findIndex((item) => item.phone && item.phone === parent.phone) === index),
      attendance: {
        total: totalAttendance,
        present: attendanceCounts.present ?? 0,
        absent: attendanceCounts.absent ?? 0,
        late: attendanceCounts.late ?? 0,
        leave: attendanceCounts.leave ?? 0,
        percentage: totalAttendance ? Math.round((attended / totalAttendance) * 1000) / 10 : 0,
      },
      fees: {
        payable,
        paid,
        outstanding: Math.max(0, payable - paid),
        pendingInstallments: installments.filter((item) =>
          item.status === "PENDING" || item.status === "PARTIAL").length,
      },
      recentResults: marks.map((mark) => ({
        id: mark.id,
        exam: mark.examSchedule.exam.name,
        subject: mark.examSchedule.subject.name,
        obtained: mark.marksObtained === null ? null : Number(mark.marksObtained),
        maximum: Number(mark.examSchedule.maxMarks),
        passMarks: mark.examSchedule.passMarks === null ? null : Number(mark.examSchedule.passMarks),
        status: mark.status,
      })),
    });
  });
}

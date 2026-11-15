import { apiHandler } from "@/lib/api";
import { requireTenant, teacherClassScope } from "@/lib/auth";
import { isMemberRouteAllowed } from "@/lib/navigation-access";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

type SearchResult = {
  id: string;
  type: "Student" | "Teacher" | "Admission" | "Receipt" | "Query";
  title: string;
  description: string;
  href: string;
};

export async function GET(request: Request) {
  return apiHandler(async () => {
    const membership = await requireTenant();
    const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
    if (query.length < 2) return ApiResponse.success<SearchResult[]>([]);

    const schoolId = membership.schoolId;
    const schoolSlug = membership.school.slug;
    const canSearchStudents = isMemberRouteAllowed(membership, "students");
    const canSearchTeachers = isMemberRouteAllowed(membership, "teachers");
    const canSearchAdmissions = isMemberRouteAllowed(membership, "admissions");
    const canSearchFees = isMemberRouteAllowed(membership, "fees/payments");
    const canSearchQueries = isMemberRouteAllowed(membership, "queries");
    const teacherScope = membership.role === "TEACHER" && canSearchStudents
      ? await teacherClassScope(schoolId)
      : [];

    const [students, teachers, admissions, payments, tickets] = await Promise.all([
      canSearchStudents
        ? prisma.student.findMany({
            where: {
              schoolId,
              status: "ACTIVE",
              OR: [
                { admissionNo: { contains: query, mode: "insensitive" } },
                { fullName: { contains: query, mode: "insensitive" } },
              ],
              ...(membership.role === "TEACHER"
                ? {
                    enrollments: {
                      some: {
                        active: true,
                        OR: teacherScope.map((scope) => ({
                          academicYearId: scope.academicYearId,
                          classId: scope.classId,
                          sectionId: scope.sectionId,
                        })),
                      },
                    },
                  }
                : {}),
            },
            take: 6,
            orderBy: { fullName: "asc" },
            select: {
              id: true,
              admissionNo: true,
              fullName: true,
              enrollments: {
                where: { active: true, academicYear: { active: true } },
                take: 1,
                select: {
                  class: { select: { name: true } },
                  section: { select: { name: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      canSearchTeachers
        ? prisma.teacher.findMany({
            where: {
              schoolId,
              active: true,
              OR: [
                { employeeId: { contains: query, mode: "insensitive" } },
                { fullName: { contains: query, mode: "insensitive" } },
              ],
            },
            take: 5,
            orderBy: { fullName: "asc" },
            select: { id: true, employeeId: true, fullName: true, designation: true },
          })
        : Promise.resolve([]),
      canSearchAdmissions
        ? prisma.admissionApplication.findMany({
            where: {
              schoolId,
              OR: [
                { applicationNo: { contains: query, mode: "insensitive" } },
                { studentName: { contains: query, mode: "insensitive" } },
              ],
            },
            take: 5,
            orderBy: { submittedAt: "desc" },
            select: { id: true, applicationNo: true, studentName: true, status: true },
          })
        : Promise.resolve([]),
      canSearchFees
        ? prisma.feePayment.findMany({
            where: {
              schoolId,
              OR: [
                { receiptNo: { contains: query, mode: "insensitive" } },
                { referenceNo: { contains: query, mode: "insensitive" } },
                {
                  studentEnrollment: {
                    is: { student: { is: { fullName: { contains: query, mode: "insensitive" } } } },
                  },
                },
              ],
            },
            take: 5,
            orderBy: { paymentDate: "desc" },
            select: {
              id: true,
              receiptNo: true,
              amount: true,
              studentEnrollment: { select: { student: { select: { fullName: true } } } },
            },
          })
        : Promise.resolve([]),
      canSearchQueries
        ? prisma.supportTicket.findMany({
            where: {
              schoolId,
              OR: [
                { ticketNo: { contains: query, mode: "insensitive" } },
                { subject: { contains: query, mode: "insensitive" } },
                { student: { is: { fullName: { contains: query, mode: "insensitive" } } } },
              ],
            },
            take: 5,
            orderBy: { updatedAt: "desc" },
            select: { id: true, ticketNo: true, subject: true, status: true },
          })
        : Promise.resolve([]),
    ]);

    const results: SearchResult[] = [
      ...students.map((student) => {
        const enrollment = student.enrollments[0];
        return {
          id: `student-${student.id}`,
          type: "Student" as const,
          title: student.fullName || student.admissionNo,
          description: [student.admissionNo, enrollment?.class.name, enrollment?.section.name]
            .filter(Boolean)
            .join(" · "),
          href: `/${schoolSlug}/students/${student.id}`,
        };
      }),
      ...teachers.map((teacher) => ({
        id: `teacher-${teacher.id}`,
        type: "Teacher" as const,
        title: teacher.fullName,
        description: [teacher.employeeId, teacher.designation].filter(Boolean).join(" · "),
        href: `/${schoolSlug}/teachers/${teacher.id}`,
      })),
      ...admissions.map((application) => ({
        id: `admission-${application.id}`,
        type: "Admission" as const,
        title: application.studentName,
        description: `${application.applicationNo} · ${application.status.replaceAll("_", " ")}`,
        href: `/${schoolSlug}/admissions?search=${encodeURIComponent(application.applicationNo)}`,
      })),
      ...payments.map((payment) => ({
        id: `receipt-${payment.id}`,
        type: "Receipt" as const,
        title: payment.receiptNo,
        description: `${payment.studentEnrollment.student.fullName || "Student"} · ₹${payment.amount.toString()}`,
        href: `/${schoolSlug}/fees/receipts/${payment.id}`,
      })),
      ...tickets.map((ticket) => ({
        id: `query-${ticket.id}`,
        type: "Query" as const,
        title: ticket.subject,
        description: `${ticket.ticketNo} · ${ticket.status.replaceAll("_", " ")}`,
        href: `/${schoolSlug}/queries/${ticket.id}`,
      })),
    ];

    return ApiResponse.success(results);
  });
}

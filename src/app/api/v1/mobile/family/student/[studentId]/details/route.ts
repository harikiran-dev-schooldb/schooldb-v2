import { attendanceService } from "@/features/attendance/services/attendance.service";
import { studentExamService } from "@/features/exams/services/student-exam.service";
import { homeworkService } from "@/features/homework/services/homework.service";
import { studentFeeLedgerService } from "@/features/student-fees/services/student-fee-ledger.service";
import { studentFeeService } from "@/features/student-fees/services/student-fee.service";
import { timetableService } from "@/features/timetable/services/timetable.service";
import { audienceVisibility } from "@/features/audiences/types";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { requireStudentAccess } from "@/lib/student-access";
import { z } from "zod";

const leaveRequestSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  reason: z.string().trim().min(5).max(2000),
});

const cancelLeaveSchema = z.object({ requestId: z.string().min(1) });

function dateAtUtcMidnight(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  return apiHandler(async () => {
    const { studentId } = await params;
    const { membership, student, enrollment } = await requireStudentAccess(
      undefined,
      studentId,
    );

    const [
      attendance,
      homework,
      assignments,
      results,
      timetable,
      leaveRequests,
      publishedCalendarEvents,
      examSchedule,
      transport,
    ] = await Promise.all([
      enrollment
        ? attendanceService.studentAttendanceReport(
            membership.schoolId,
            studentId,
            enrollment.academicYearId,
          )
        : null,
      enrollment
        ? homeworkService.studentList(membership.schoolId, enrollment)
        : [],
      studentFeeService.list(membership.schoolId, studentId),
      enrollment
        ? studentExamService.listResults(membership.schoolId, enrollment)
        : [],
      enrollment
        ? timetableService.classView(
            membership.schoolId,
            enrollment.academicYearId,
            enrollment.classId,
            enrollment.sectionId,
          )
        : [],
      prisma.leaveRequest.findMany({
        where: { schoolId: membership.schoolId, studentId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.schoolCalendarEvent.findMany({
        where: {
          schoolId: membership.schoolId,
          archived: false,
          OR: audienceVisibility([student]),
        },
        orderBy: [{ startDate: "asc" }, { title: "asc" }],
        take: 500,
      }),
      enrollment
        ? studentExamService.listSchedule(membership.schoolId, enrollment)
        : [],
      enrollment
        ? prisma.studentTransportAssignment.findFirst({
            where: {
              schoolId: membership.schoolId,
              studentEnrollmentId: enrollment.id,
              active: true,
              route: { active: true },
              stop: { active: true },
            },
            orderBy: { createdAt: "desc" },
            select: {
              pickupEnabled: true,
              dropEnabled: true,
              startDate: true,
              notes: true,
              route: {
                select: {
                  code: true,
                  name: true,
                  pickupStart: true,
                  dropStart: true,
                  vehicle: {
                    select: {
                      registrationNo: true,
                      name: true,
                      type: true,
                      driverName: true,
                      driverPhone: true,
                      attendantName: true,
                      attendantPhone: true,
                    },
                  },
                  stops: {
                    where: { active: true },
                    orderBy: { sequence: "asc" },
                    select: {
                      id: true,
                      name: true,
                      sequence: true,
                      pickupTime: true,
                      dropTime: true,
                    },
                  },
                },
              },
              stop: {
                select: {
                  id: true,
                  name: true,
                  pickupTime: true,
                  dropTime: true,
                  monthlyFee: true,
                },
              },
            },
          })
        : null,
    ]);

    const ledgers = (
      await Promise.all(
        assignments.map((assignment) =>
          studentFeeLedgerService.get(assignment.id, membership.schoolId),
        ),
      )
    ).filter((ledger) => ledger !== null);

    const feeSummary = ledgers.reduce(
      (total, ledger) => ({
        payable: total.payable + ledger.summary.total - ledger.summary.concession,
        paid: total.paid + ledger.summary.paid,
        outstanding: total.outstanding + ledger.summary.outstanding,
      }),
      { payable: 0, paid: 0, outstanding: 0 },
    );

    const combinedCalendarEvents = [...publishedCalendarEvents.map((event) => ({
      id: `school:${event.id}`,
      title: event.title,
      description: event.description,
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate,
      targetLabel: event.targetLabel,
    })), ...examSchedule.map((schedule) => ({
      id: `exam:${schedule.id}`,
      title: `${schedule.exam.name}: ${schedule.subject.name}`,
      description: [schedule.startTime, schedule.endTime].filter(Boolean).join(" – ") || null,
      category: "EXAM",
      startDate: schedule.examDate,
      endDate: schedule.examDate,
      targetLabel: "Exam schedule",
    })), ...homework.filter((item) => item.dueDate !== null).map((item) => ({
      id: `homework:${item.id}`,
      title: item.title,
      description: item.subject?.name ? `${item.subject.name} homework deadline` : "Homework deadline",
      category: "HOMEWORK",
      startDate: item.dueDate!,
      endDate: item.dueDate!,
      targetLabel: "Homework",
    })), ...ledgers.flatMap((ledger) =>
      ledger.installments.map((installment) => ({
        id: `fee:${installment.id}`,
        title: `${installment.name} due`,
        description: `${ledger.studentFee.feePlan.name} · ${installment.feeCategory.name}`,
        category: "FEE_DEADLINE",
        startDate: installment.dueDate,
        endDate: installment.dueDate,
        targetLabel: "Fees",
      })),
    )].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return ApiResponse.success({
      attendance: attendance
        ? {
            summary: attendance.summary,
            records: attendance.records.map((record) => ({
              id: record.id,
              date: record.session.attendanceDate,
              sessionType: record.session.sessionType,
              subjectName: record.session.subject?.name ?? null,
              status: record.status,
              remarks: record.remarks,
            })),
          }
        : null,
      homework: homework.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        subjectName: item.subject?.name ?? "General",
        assignedDate: item.assignedDate,
        dueDate: item.dueDate,
      })),
      fees: {
        summary: feeSummary,
        installments: ledgers.flatMap((ledger) =>
          ledger.installments.map((installment) => ({
            id: installment.id,
            planName: ledger.studentFee.feePlan.name,
            categoryName: installment.feeCategory.name,
            name: installment.name,
            dueDate: installment.dueDate,
            payableAmount: installment.payableAmount,
            paidAmount: installment.paidAmount,
            outstanding: installment.outstanding,
            status: installment.status,
          })),
        ),
        payments: ledgers.flatMap((ledger) =>
          ledger.payments.map((payment) => ({
            id: payment.id,
            receiptNo: payment.receiptNo,
            paymentDate: payment.paymentDate,
            amount: payment.amount,
            paymentMode: payment.paymentMode,
          })),
        ),
      },
      results: results.map((result) => ({
        id: result.id,
        name: result.name,
        startDate: result.startDate,
        endDate: result.endDate,
        obtained: result.obtained,
        maximum: result.maximum,
        percentage: result.percentage,
        status: result.status,
      })),
      timetable: timetable
        .filter((entry) => entry.active && entry.teacherAllocation.active)
        .map((entry) => ({
          id: entry.id,
          day: entry.day,
          periodName: entry.period.name,
          displayOrder: entry.period.displayOrder,
          startTime: entry.period.startTime,
          endTime: entry.period.endTime,
          subjectName: entry.teacherAllocation.subject.name,
          teacherName: entry.teacherAllocation.teacher.fullName,
        })),
      leaveRequests: leaveRequests.map((request) => ({
        id: request.id,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        status: request.status,
        decisionNote: request.decisionNote,
        createdAt: request.createdAt,
      })),
      calendarEvents: combinedCalendarEvents,
      transport: transport
        ? {
            pickupEnabled: transport.pickupEnabled,
            dropEnabled: transport.dropEnabled,
            startDate: transport.startDate,
            notes: transport.notes,
            routeCode: transport.route.code,
            routeName: transport.route.name,
            routePickupStart: transport.route.pickupStart,
            routeDropStart: transport.route.dropStart,
            stop: {
              ...transport.stop,
              monthlyFee:
                transport.stop.monthlyFee === null
                  ? null
                  : Number(transport.stop.monthlyFee),
            },
            vehicle: transport.route.vehicle,
            stops: transport.route.stops,
          }
        : null,
    });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  return apiHandler(async () => {
    const { studentId } = await params;
    const context = await requireStudentAccess(undefined, studentId);
    if (!context.enrollment) {
      throw new ApiError(400, "This student does not have an active enrollment.");
    }

    const parsed = leaveRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, "Choose valid dates and enter a reason of at least 5 characters.");
    }

    const startDate = dateAtUtcMidnight(parsed.data.startDate);
    const endDate = dateAtUtcMidnight(parsed.data.endDate);
    const durationDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (endDate < startDate) {
      throw new ApiError(400, "The end date must be the same as or later than the start date.");
    }
    if (durationDays > 90) {
      throw new ApiError(400, "A single leave request cannot exceed 90 days.");
    }

    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        schoolId: context.membership.schoolId,
        studentId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true },
    });
    if (overlapping) {
      throw new ApiError(409, "This student already has a pending or approved request for these dates.");
    }

    const created = await prisma.leaveRequest.create({
      data: {
        schoolId: context.membership.schoolId,
        studentId,
        enrollmentId: context.enrollment.id,
        requestedBy: context.membership.userId,
        startDate,
        endDate,
        reason: parsed.data.reason,
      },
    });
    return ApiResponse.success({ id: created.id }, "Leave request submitted.", 201);
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  return apiHandler(async () => {
    const { studentId } = await params;
    const context = await requireStudentAccess(undefined, studentId);
    const parsed = cancelLeaveSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "Leave request is required.");

    const updated = await prisma.leaveRequest.updateMany({
      where: {
        id: parsed.data.requestId,
        schoolId: context.membership.schoolId,
        studentId,
        status: "PENDING",
      },
      data: { status: "CANCELLED" },
    });
    if (updated.count !== 1) {
      throw new ApiError(409, "This leave request can no longer be cancelled.");
    }
    return ApiResponse.success({ id: parsed.data.requestId }, "Leave request cancelled.");
  });
}

import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import {
  classTeacherScope,
  requireCurrentTeacher,
  requirePermission,
  requireTeacherFeatureAccess,
  requireTeacherStudent,
  requireTenant,
} from "@/lib/auth";
import { PERMISSIONS } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";

import { examResultService } from "@/features/exams/services/exam-result.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: Props) {
  return apiHandler(async () => {
    const { id: studentId } = await params;
    const tenant = await requireTenant();
    if (tenant.role === "TEACHER") {
      await requireTeacherFeatureAccess("RESULTS");
      await requireTeacherStudent(studentId);
    } else {
      await requirePermission(PERMISSIONS.STUDENT_PRIVATE_READ);
    }
    const url = new URL(request.url);
    const examId = url.searchParams.get("examId");

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: tenant.schoolId },
      select: { id: true },
    });

    if (!student) {
      return ApiResponse.error("Student not found.", 404);
    }

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { schoolId: tenant.schoolId, studentId },
      select: {
        id: true,
        academicYearId: true,
        classId: true,
        sectionId: true,
      },
    });

    const academicYearIds = [...new Set(enrollments.map((item) => item.academicYearId))];

    // In the exam workflow, PUBLISHED means the exam schedule is published.
    // COMPLETED means the results have been published and are safe to show
    // on the student profile.
    const exams = academicYearIds.length
      ? await prisma.exam.findMany({
          where: {
            schoolId: tenant.schoolId,
            academicYearId: { in: academicYearIds },
            active: true,
            status: "COMPLETED",
            ...(examId ? { id: examId } : {}),
          },
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            academicYearId: true,
            academicYear: { select: { id: true, name: true } },
          },
          orderBy: [{ academicYear: { startDate: "desc" } }, { startDate: "desc" }],
        })
      : [];

    const examOptions = examId
      ? await prisma.exam.findMany({
          where: {
            schoolId: tenant.schoolId,
            academicYearId: { in: academicYearIds },
            active: true,
            status: "COMPLETED",
          },
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            academicYearId: true,
            academicYear: { select: { id: true, name: true } },
          },
          orderBy: [{ academicYear: { startDate: "desc" } }, { startDate: "desc" }],
        })
      : exams;

    const selectedExam = examId ? exams[0] ?? null : examOptions[0] ?? null;

    if (!selectedExam) {
      return ApiResponse.success({ exams: examOptions, selectedExamId: null, result: null });
    }

    const enrollment = enrollments.find(
      (item) => item.academicYearId === selectedExam.academicYearId,
    );

    if (!enrollment) {
      return ApiResponse.success({ exams: examOptions, selectedExamId: selectedExam.id, result: null });
    }

    const examResults = await examResultService.getResults({
      examId: selectedExam.id,
      schoolId: tenant.schoolId,
      classId: enrollment.classId,
      sectionId: enrollment.sectionId,
    });

    let result = examResults.results.find((item) => item.studentId === studentId) ?? null;

    if (tenant.role === "TEACHER" && result) {
      const [teacher, classAssignments] = await Promise.all([
        requireCurrentTeacher(tenant.schoolId),
        classTeacherScope(tenant.schoolId),
      ]);
      const isClassTeacher = classAssignments.some(
        (item) =>
          item.academicYearId === selectedExam.academicYearId &&
          item.classId === enrollment.classId &&
          item.sectionId === enrollment.sectionId,
      );

      if (!isClassTeacher) {
        const allocations = await prisma.teacherAllocation.findMany({
          where: {
            schoolId: tenant.schoolId,
            teacherId: teacher.id,
            academicYearId: selectedExam.academicYearId,
            classId: enrollment.classId,
            sectionId: enrollment.sectionId,
            active: true,
          },
          select: { subjectId: true },
        });
        const subjectIds = new Set(allocations.map((item) => item.subjectId));
        const subjectResults = result.subjectResults.filter((item) => subjectIds.has(item.subject.id));
        const counted = subjectResults.filter((item) => item.status !== "EXEMPTED" && item.assessmentType !== "GRADE");
        const totalObtained = counted.reduce((sum, item) => sum + (item.marksObtained ?? 0), 0);
        const totalMaxMarks = counted.reduce((sum, item) => sum + item.maxMarks, 0);
        const countStatus = (status: string) => subjectResults.filter((item) => item.status === status).length;
        result = {
          ...result,
          subjectResults,
          subjects: subjectResults.length,
          totalObtained,
          totalMaxMarks,
          percentage: totalMaxMarks ? Number(((totalObtained / totalMaxMarks) * 100).toFixed(2)) : 0,
          passedSubjects: countStatus("PASS"),
          failedSubjects: countStatus("FAIL") + countStatus("ABSENT"),
          absentSubjects: countStatus("ABSENT"),
          pendingSubjects: countStatus("PENDING"),
          exemptedSubjects: countStatus("EXEMPTED"),
          status: countStatus("PENDING") ? "PENDING" : countStatus("FAIL") || countStatus("ABSENT") ? "FAIL" : "PASS",
          rank: null,
        };
      }
    }

    return ApiResponse.success({
      exams: examOptions,
      selectedExamId: selectedExam.id,
      result,
    });
  });
}

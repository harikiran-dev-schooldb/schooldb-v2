import { prisma } from "@/lib/prisma";
import { bulkAttendanceSchema, normalizeAdmissionNo } from "../schemas/bulk-attendance.schema";

type RowResult = {
  row: number;
  admissionNo: string;
  date: string;
  status: "imported" | "failed";
  message?: string;
};

type PreparedRow = {
  row: number;
  admissionNo: string;
  date: string;
  attendanceDate: Date;
  studentId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
};

function day(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function groupKey(item: PreparedRow) {
  return [item.academicYearId, item.classId, item.sectionId, item.date].join(":");
}

export const attendanceBulkService = {
  async import(schoolId: string, input: unknown) {
    const parsed = bulkAttendanceSchema.parse(input);
    const results: RowResult[] = [];
    const seen = new Set<string>();

    const candidates = parsed.attendance.flatMap((item, index) => {
      const row = index + 2;
      const key = `${normalizeAdmissionNo(item.admissionNo)}:${item.date}`;
      if (seen.has(key)) {
        results.push({ row, ...item, status: "failed", message: "Duplicate admission number and date in the import file." });
        return [];
      }
      seen.add(key);
      return [{ row, ...item }];
    });

    const admissionNos = [...new Set(candidates.map((item) => normalizeAdmissionNo(item.admissionNo)))];
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        OR: admissionNos.map((admissionNo) => ({
          admissionNo: { equals: admissionNo, mode: "insensitive" as const },
        })),
      },
      select: { id: true, admissionNo: true },
    });
    const studentByAdmissionNo = new Map(
      students.map((student) => [normalizeAdmissionNo(student.admissionNo), student]),
    );

    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      select: { id: true, name: true, startDate: true, endDate: true, attendanceMode: true },
    });

    const studentIds = students.map((student) => student.id);
    const enrollments = studentIds.length
      ? await prisma.studentEnrollment.findMany({
          where: { schoolId, studentId: { in: studentIds } },
          select: { studentId: true, academicYearId: true, classId: true, sectionId: true },
        })
      : [];
    const enrollmentByStudentYear = new Map(
      enrollments.map((enrollment) => [`${enrollment.studentId}:${enrollment.academicYearId}`, enrollment]),
    );

    const prepared: PreparedRow[] = [];

    for (const candidate of candidates) {
      const student = studentByAdmissionNo.get(normalizeAdmissionNo(candidate.admissionNo));
      if (!student) {
        results.push({ ...candidate, status: "failed", message: "Student admission number not found." });
        continue;
      }

      const attendanceDate = day(candidate.date);
      if (Number.isNaN(attendanceDate.getTime())) {
        results.push({ ...candidate, status: "failed", message: "Invalid attendance date." });
        continue;
      }

      const academicYear = academicYears.find((item) => attendanceDate >= item.startDate && attendanceDate <= item.endDate);
      if (!academicYear) {
        results.push({ ...candidate, status: "failed", message: "No academic year contains this attendance date." });
        continue;
      }

      if (academicYear.attendanceMode !== "ONCE_DAILY") {
        results.push({
          ...candidate,
          status: "failed",
          message: `${academicYear.attendanceMode} attendance cannot be inferred from admissionNo and date only.`,
        });
        continue;
      }

      const enrollment = enrollmentByStudentYear.get(`${student.id}:${academicYear.id}`);
      if (!enrollment) {
        results.push({ ...candidate, status: "failed", message: `Student is not enrolled in ${academicYear.name}.` });
        continue;
      }

      prepared.push({
        ...candidate,
        attendanceDate,
        studentId: student.id,
        academicYearId: academicYear.id,
        classId: enrollment.classId,
        sectionId: enrollment.sectionId,
      });
    }

    const groups = new Map<string, PreparedRow[]>();
    for (const item of prepared) {
      const key = groupKey(item);
      const group = groups.get(key);
      if (group) group.push(item);
      else groups.set(key, [item]);
    }

    for (const group of groups.values()) {
      const first = group[0];
      try {
        await prisma.$transaction(async (tx) => {
          let session = await tx.attendanceSession.findFirst({
            where: {
              schoolId,
              academicYearId: first.academicYearId,
              classId: first.classId,
              sectionId: first.sectionId,
              attendanceDate: first.attendanceDate,
              sessionType: "DAILY",
            },
            select: { id: true, locked: true },
          });

          if (session?.locked) throw new Error("DAILY attendance session is locked.");

          if (!session) {
            session = await tx.attendanceSession.create({
              data: {
                schoolId,
                academicYearId: first.academicYearId,
                classId: first.classId,
                sectionId: first.sectionId,
                attendanceDate: first.attendanceDate,
                sessionType: "DAILY",
              },
              select: { id: true, locked: true },
            });

            const groupEnrollments = await tx.studentEnrollment.findMany({
              where: {
                schoolId,
                academicYearId: first.academicYearId,
                classId: first.classId,
                sectionId: first.sectionId,
                active: true,
              },
              select: { studentId: true },
            });

            if (groupEnrollments.length) {
              await tx.attendance.createMany({
                data: groupEnrollments.map((enrollment) => ({
                  schoolId,
                  sessionId: session!.id,
                  studentId: enrollment.studentId,
                  status: "PRESENT" as const,
                })),
                skipDuplicates: true,
              });
            }
          }

          const absentStudentIds = [...new Set(group.map((item) => item.studentId))];
          if (absentStudentIds.length) {
            await tx.attendance.updateMany({
              where: { sessionId: session.id, studentId: { in: absentStudentIds } },
              data: { status: "ABSENT" },
            });

            const existingRecords = await tx.attendance.findMany({
              where: { sessionId: session.id, studentId: { in: absentStudentIds } },
              select: { studentId: true },
            });
            const existingStudentIds = new Set(existingRecords.map((record) => record.studentId));
            const missingStudentIds = absentStudentIds.filter((studentId) => !existingStudentIds.has(studentId));

            if (missingStudentIds.length) {
              await tx.attendance.createMany({
                data: missingStudentIds.map((studentId) => ({
                  schoolId,
                  sessionId: session!.id,
                  studentId,
                  status: "ABSENT" as const,
                })),
                skipDuplicates: true,
              });
            }
          }
        });

        for (const item of group) {
          results.push({ row: item.row, admissionNo: item.admissionNo, date: item.date, status: "imported" });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Attendance import failed.";
        for (const item of group) {
          results.push({ row: item.row, admissionNo: item.admissionNo, date: item.date, status: "failed", message });
        }
      }
    }

    const ordered = [...results].sort((a, b) => a.row - b.row);
    return {
      imported: ordered.filter((item) => item.status === "imported").length,
      failed: ordered.filter((item) => item.status === "failed").length,
      errors: ordered
        .filter((item) => item.status === "failed")
        .map((item) => ({ row: item.row, message: `${item.admissionNo} (${item.date}): ${item.message}` })),
    };
  },
};

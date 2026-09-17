import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

const MAX_ROWS = 1000;
const VALID_STATUSES = new Set(["PRESENT", "ABSENT", "EXEMPTED"]);

type ImportRow = {
  examName: string;
  academicYear: string;
  subjectName: string;
  admissionNo: string;
  marks: string;
  status: string;
  remarks: string;
};

type PreparedRow = Omit<ImportRow, "status" | "marks"> & {
  status: "PRESENT" | "ABSENT" | "EXEMPTED";
  marks: number | null;
};

type ResolvedRow = {
  schoolId: string;
  examScheduleId: string;
  studentEnrollmentId: string;
  marksObtained: number | null;
  status: "PRESENT" | "ABSENT" | "EXEMPTED";
  remarks: string | null;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeStatus(value: string) {
  return value.trim().toUpperCase();
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await request.json()) as { marks?: unknown };
    const input = Array.isArray(body.marks) ? body.marks : [];

    if (!input.length) throw new Error("No exam marks were provided.");
    if (input.length > MAX_ROWS) {
      throw new Error(`Maximum ${MAX_ROWS} marks per import.`);
    }

    const rows = input as ImportRow[];
    const seen = new Map<string, number>();
    const prepared: PreparedRow[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 2;
      const examName = row.examName?.trim() ?? "";
      const academicYear = row.academicYear?.trim() ?? "";
      const subjectName = row.subjectName?.trim() ?? "";
      const admissionNo = row.admissionNo?.trim() ?? "";
      const status = normalizeStatus(row.status || "PRESENT");
      const marksText = row.marks?.trim() ?? "";

      if (!examName || !academicYear || !subjectName || !admissionNo) {
        throw new Error(
          `Row ${rowNumber}: Exam, academic year, subject and admission number are required.`,
        );
      }

      if (!VALID_STATUSES.has(status)) {
        throw new Error(
          `Row ${rowNumber}: Status must be PRESENT, ABSENT or EXEMPTED.`,
        );
      }

      const marks = marksText === "" ? null : Number(marksText);

      if (status === "PRESENT" && marks === null) {
        throw new Error(
          `Row ${rowNumber}: Marks are required for PRESENT students.`,
        );
      }

      if (marks !== null && (!Number.isFinite(marks) || marks < 0)) {
        throw new Error(
          `Row ${rowNumber}: Marks must be a valid non-negative number.`,
        );
      }

      if (status !== "PRESENT" && marks !== null) {
        throw new Error(
          `Row ${rowNumber}: Marks must be blank when status is ${status}.`,
        );
      }

      const duplicateKey = [academicYear, examName, admissionNo, subjectName]
        .map(normalize)
        .join(":");
      const firstRow = seen.get(duplicateKey);

      if (firstRow !== undefined) {
        throw new Error(
          `Row ${rowNumber}: Duplicate result. Admission No. ${admissionNo} already has ${subjectName} for ${examName} ${academicYear} in Row ${firstRow}.`,
        );
      }

      seen.set(duplicateKey, rowNumber);
      prepared.push({
        ...row,
        examName,
        academicYear,
        subjectName,
        admissionNo,
        status: status as PreparedRow["status"],
        marks,
      });
    }

    const [academicYears, exams, subjects, students, enrollments, schedules] =
      await Promise.all([
        prisma.academicYear.findMany({
          where: { schoolId: tenant.schoolId },
          select: { id: true, name: true },
        }),
        prisma.exam.findMany({
          where: { schoolId: tenant.schoolId },
          select: { id: true, name: true, academicYearId: true },
        }),
        prisma.subject.findMany({
          where: { schoolId: tenant.schoolId },
          select: { id: true, name: true },
        }),
        prisma.student.findMany({
          where: { schoolId: tenant.schoolId },
          select: { id: true, admissionNo: true },
        }),
        prisma.studentEnrollment.findMany({
          where: { schoolId: tenant.schoolId },
          select: {
            id: true,
            studentId: true,
            academicYearId: true,
            classId: true,
            sectionId: true,
          },
        }),
        prisma.examSchedule.findMany({
          where: { schoolId: tenant.schoolId },
          select: {
            id: true,
            examId: true,
            classId: true,
            sectionId: true,
            subjectId: true,
            maxMarks: true,
          },
        }),
      ]);

    const yearByName = new Map(
      academicYears.map((item) => [normalize(item.name), item]),
    );
    const subjectByName = new Map(
      subjects.map((item) => [normalize(item.name), item]),
    );
    const studentByAdmission = new Map(
      students.map((item) => [normalize(item.admissionNo), item]),
    );
    const examByKey = new Map(
      exams.map((item) => [
        `${item.academicYearId}:${normalize(item.name)}`,
        item,
      ]),
    );
    const enrollmentByKey = new Map(
      enrollments.map((item) => [
        `${item.studentId}:${item.academicYearId}`,
        item,
      ]),
    );
    const scheduleByKey = new Map(
      schedules.map((item) => [
        [item.examId, item.classId, item.sectionId ?? "", item.subjectId].join(
          ":",
        ),
        item,
      ]),
    );

    const resolved: ResolvedRow[] = [];

    for (let i = 0; i < prepared.length; i += 1) {
      const row = prepared[i];
      const rowNumber = i + 2;
      const year = yearByName.get(normalize(row.academicYear));

      if (!year) {
        throw new Error(
          `Row ${rowNumber}: Academic year not found: ${row.academicYear}.`,
        );
      }

      const exam = examByKey.get(`${year.id}:${normalize(row.examName)}`);
      if (!exam) {
        throw new Error(`Row ${rowNumber}: Exam not found: ${row.examName}.`);
      }

      const subject = subjectByName.get(normalize(row.subjectName));
      if (!subject) {
        throw new Error(
          `Row ${rowNumber}: Subject not found: ${row.subjectName}.`,
        );
      }

      const student = studentByAdmission.get(normalize(row.admissionNo));
      if (!student) {
        throw new Error(
          `Row ${rowNumber}: Student not found: ${row.admissionNo}.`,
        );
      }

      const enrollment = enrollmentByKey.get(`${student.id}:${year.id}`);
      if (!enrollment) {
        throw new Error(
          `Row ${rowNumber}: Student ${row.admissionNo} is not enrolled for ${row.academicYear}.`,
        );
      }

      const exactSchedule = scheduleByKey.get(
        [
          exam.id,
          enrollment.classId,
          enrollment.sectionId ?? "",
          subject.id,
        ].join(":"),
      );
      const allSectionsSchedule = scheduleByKey.get(
        [exam.id, enrollment.classId, "", subject.id].join(":"),
      );
      const schedule = exactSchedule ?? allSectionsSchedule;

      if (!schedule) {
        throw new Error(
          `Row ${rowNumber}: Exam schedule not found for ${row.subjectName} in student ${row.admissionNo}'s enrolled class/section.`,
        );
      }

      if (row.marks !== null && row.marks > Number(schedule.maxMarks)) {
        throw new Error(
          `Row ${rowNumber}: Marks ${row.marks} exceed the maximum ${schedule.maxMarks}.`,
        );
      }

      resolved.push({
        schoolId: tenant.schoolId,
        examScheduleId: schedule.id,
        studentEnrollmentId: enrollment.id,
        marksObtained: row.marks,
        status: row.status,
        remarks: row.remarks?.trim() || null,
      });
    }

    const existing = await prisma.studentExamMark.findMany({
      where: {
        schoolId: tenant.schoolId,
        OR: resolved.map((row) => ({
          examScheduleId: row.examScheduleId,
          studentEnrollmentId: row.studentEnrollmentId,
        })),
      },
      select: {
        id: true,
        examScheduleId: true,
        studentEnrollmentId: true,
      },
    });

    const existingByKey = new Map(
      existing.map((mark) => [
        `${mark.examScheduleId}:${mark.studentEnrollmentId}`,
        mark,
      ]),
    );

    const toCreate: ResolvedRow[] = [];
    const toUpdate: Array<{ id: string; row: ResolvedRow }> = [];

    for (const row of resolved) {
      const existingMark = existingByKey.get(
        `${row.examScheduleId}:${row.studentEnrollmentId}`,
      );

      if (existingMark) {
        toUpdate.push({ id: existingMark.id, row });
      } else {
        toCreate.push(row);
      }
    }

    // createMany is a single SQL operation and is substantially faster than
    // issuing one create query per mark inside a transaction.
    if (toCreate.length > 0) {
      await prisma.studentExamMark.createMany({ data: toCreate });
    }

    // Existing marks need different values per row, so update them in small
    // parallel chunks. Avoid a long-running interactive transaction here;
    // Neon/Prisma can exceed the default 5-second transaction timeout when a
    // large CSV contains hundreds of individual updates.
    const UPDATE_CHUNK_SIZE = 25;
    for (let i = 0; i < toUpdate.length; i += UPDATE_CHUNK_SIZE) {
      const chunk = toUpdate.slice(i, i + UPDATE_CHUNK_SIZE);
      await Promise.all(
        chunk.map(({ id, row }) =>
          prisma.studentExamMark.update({
            where: { id },
            data: {
              marksObtained: row.marksObtained,
              status: row.status,
              remarks: row.remarks,
            },
          }),
        ),
      );
    }

    const created = toCreate.length;
    const updated = toUpdate.length;

    await recordAuditLog({
      actor: tenant,
      module: "ACADEMICS",
      action: "IMPORT",
      entityType: "EXAM_MARK",
      summary: `Imported ${resolved.length} exam mark${resolved.length === 1 ? "" : "s"}: ${created} created, ${updated} updated.`,
      metadata: {
        recordCount: resolved.length,
        createdCount: created,
        updatedCount: updated,
      },
    });

    return ApiResponse.success(
      { created, updated, failed: 0, errors: [] },
      `Exam marks imported successfully: ${created} created, ${updated} updated.`,
    );
  });
}

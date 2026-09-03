import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const MAX_ROWS = 1000;
const VALID_STATUSES = new Set(["PRESENT", "ABSENT", "EXEMPTED"]);

type ImportRow = { examName: string; academicYear: string; className: string; sectionName: string; subjectName: string; admissionNo: string; marks: string; status: string; remarks: string };
type PreparedRow = Omit<ImportRow, "status" | "marks"> & { status: "PRESENT" | "ABSENT" | "EXEMPTED"; marks: number | null };
type ResolvedRow = { schoolId: string; examScheduleId: string; studentEnrollmentId: string; marksObtained: number | null; status: "PRESENT" | "ABSENT" | "EXEMPTED"; remarks: string | null };

function normalize(value: string) { return value.trim().toLowerCase(); }
function normalizeStatus(value: string) { return value.trim().toUpperCase(); }

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const body = (await request.json()) as { marks?: unknown };
    const input = Array.isArray(body.marks) ? body.marks : [];
    if (!input.length) throw new Error("No exam marks were provided.");
    if (input.length > MAX_ROWS) throw new Error(`Maximum ${MAX_ROWS} marks per import.`);
    const rows = input as ImportRow[];
    const seen = new Set<string>();
    const prepared: PreparedRow[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]; const rowNumber = i + 2;
      const examName = row.examName?.trim() ?? ""; const academicYear = row.academicYear?.trim() ?? "";
      const className = row.className?.trim() ?? ""; const sectionName = row.sectionName?.trim() ?? "";
      const subjectName = row.subjectName?.trim() ?? ""; const admissionNo = row.admissionNo?.trim() ?? "";
      const status = normalizeStatus(row.status || "PRESENT"); const marksText = row.marks?.trim() ?? "";
      if (!examName || !academicYear || !className || !subjectName || !admissionNo) throw new Error(`Row ${rowNumber}: Exam, academic year, class, subject and admission number are required.`);
      if (!VALID_STATUSES.has(status)) throw new Error(`Row ${rowNumber}: Status must be PRESENT, ABSENT or EXEMPTED.`);
      const marks = marksText === "" ? null : Number(marksText);
      if (status === "PRESENT" && marks === null) throw new Error(`Row ${rowNumber}: Marks are required for PRESENT students.`);
      if (marks !== null && (!Number.isFinite(marks) || marks < 0)) throw new Error(`Row ${rowNumber}: Marks must be a valid non-negative number.`);
      if (status !== "PRESENT" && marks !== null) throw new Error(`Row ${rowNumber}: Marks must be blank when status is ${status}.`);
      const duplicateKey = [examName, academicYear, className, sectionName, subjectName, admissionNo].map(normalize).join(":");
      if (seen.has(duplicateKey)) throw new Error(`Duplicate student mark in import at row ${rowNumber}.`);
      seen.add(duplicateKey); prepared.push({ ...row, examName, academicYear, className, sectionName, subjectName, admissionNo, status: status as PreparedRow["status"], marks });
    }
    const [academicYears, exams, classes, sections, subjects, students, enrollments, schedules] = await Promise.all([
      prisma.academicYear.findMany({ where: { schoolId: tenant.schoolId }, select: { id: true, name: true } }),
      prisma.exam.findMany({ where: { schoolId: tenant.schoolId }, select: { id: true, name: true, academicYearId: true } }),
      prisma.class.findMany({ where: { schoolId: tenant.schoolId }, select: { id: true, name: true } }),
      prisma.section.findMany({ select: { id: true, name: true, classId: true } }),
      prisma.subject.findMany({ where: { schoolId: tenant.schoolId }, select: { id: true, name: true } }),
      prisma.student.findMany({ where: { schoolId: tenant.schoolId }, select: { id: true, admissionNo: true } }),
      prisma.studentEnrollment.findMany({ where: { schoolId: tenant.schoolId }, select: { id: true, studentId: true, academicYearId: true, classId: true, sectionId: true } }),
      prisma.examSchedule.findMany({ where: { schoolId: tenant.schoolId }, select: { id: true, examId: true, classId: true, sectionId: true, subjectId: true, maxMarks: true } }),
    ]);
    const yearByName = new Map(academicYears.map((item) => [normalize(item.name), item]));
    const classByName = new Map(classes.map((item) => [normalize(item.name), item]));
    const subjectByName = new Map(subjects.map((item) => [normalize(item.name), item]));
    const studentByAdmission = new Map(students.map((item) => [normalize(item.admissionNo), item]));
    const examByKey = new Map(exams.map((item) => [`${item.academicYearId}:${normalize(item.name)}`, item]));
    const sectionByKey = new Map(sections.map((item) => [`${item.classId}:${normalize(item.name)}`, item]));
    const enrollmentByKey = new Map(enrollments.map((item) => [[item.studentId, item.academicYearId, item.classId, item.sectionId ?? ""].join(":"), item]));
    const scheduleByKey = new Map(schedules.map((item) => [[item.examId, item.classId, item.sectionId ?? "", item.subjectId].join(":"), item]));
    const resolved: ResolvedRow[] = [];
    for (let i = 0; i < prepared.length; i += 1) {
      const row = prepared[i]; const rowNumber = i + 2;
      const year = yearByName.get(normalize(row.academicYear)); if (!year) throw new Error(`Row ${rowNumber}: Academic year not found: ${row.academicYear}.`);
      const exam = examByKey.get(`${year.id}:${normalize(row.examName)}`); if (!exam) throw new Error(`Row ${rowNumber}: Exam not found: ${row.examName}.`);
      const classRecord = classByName.get(normalize(row.className)); if (!classRecord) throw new Error(`Row ${rowNumber}: Class not found: ${row.className}.`);
      let sectionId: string | null = null;
      if (row.sectionName) { const section = sectionByKey.get(`${classRecord.id}:${normalize(row.sectionName)}`); if (!section) throw new Error(`Row ${rowNumber}: Section ${row.sectionName} not found in ${row.className}.`); sectionId = section.id; }
      const subject = subjectByName.get(normalize(row.subjectName)); if (!subject) throw new Error(`Row ${rowNumber}: Subject not found: ${row.subjectName}.`);
      const student = studentByAdmission.get(normalize(row.admissionNo)); if (!student) throw new Error(`Row ${rowNumber}: Student not found: ${row.admissionNo}.`);
      const enrollment = enrollmentByKey.get([student.id, year.id, classRecord.id, sectionId ?? ""].join(":")); if (!enrollment) throw new Error(`Row ${rowNumber}: Student ${row.admissionNo} is not enrolled in the selected class/section for ${row.academicYear}.`);
      const schedule = scheduleByKey.get([exam.id, classRecord.id, sectionId ?? "", subject.id].join(":")); if (!schedule) throw new Error(`Row ${rowNumber}: Exam schedule not found for ${row.subjectName}.`);
      if (row.marks !== null && row.marks > Number(schedule.maxMarks)) throw new Error(`Row ${rowNumber}: Marks ${row.marks} exceed the maximum ${schedule.maxMarks}.`);
      resolved.push({ schoolId: tenant.schoolId, examScheduleId: schedule.id, studentEnrollmentId: enrollment.id, marksObtained: row.marks, status: row.status, remarks: row.remarks?.trim() || null });
    }
    const existing = await prisma.studentExamMark.findMany({ where: { schoolId: tenant.schoolId, OR: resolved.map((row) => ({ examScheduleId: row.examScheduleId, studentEnrollmentId: row.studentEnrollmentId })) }, select: { id: true } });
    if (existing.length > 0) throw new Error("One or more student marks already exist for the selected exam schedule and student.");
    await prisma.$transaction(resolved.map((row) => prisma.studentExamMark.create({ data: row })));
    return ApiResponse.success({ created: resolved.length, failed: 0, errors: [] }, "Exam marks imported successfully.");
  });
}
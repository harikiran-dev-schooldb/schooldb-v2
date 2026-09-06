import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import { studentFeeService } from "@/features/student-fees/services/student-fee.service";

const MAX_ROWS = 500;

type ImportRow = {
  admissionNo: string;
  academicYear: string;
  feePlanName: string;
};

type RowError = {
  row: number;
  message: string;
};

function normalize(value: string): string {
  return value.replace(/^\uFEFF/, "").replace(/\u00A0/g, " ").trim().toLowerCase();
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "ACCOUNTANT",
    ]);
    const body = (await request.json()) as { assignments?: unknown };
    const assignments = Array.isArray(body.assignments) ? body.assignments : [];

    if (!assignments.length) {
      throw new Error("No fee assignments were provided.");
    }

    if (assignments.length > MAX_ROWS) {
      throw new Error(`Maximum ${MAX_ROWS} fee assignments per import.`);
    }

    const rows = assignments as ImportRow[];
    const errors: RowError[] = [];
    const prepared: Array<ImportRow & { rowNumber: number }> = [];
    const seen = new Set<string>();

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 2;
      const admissionNo = String(row.admissionNo ?? "").trim();
      const academicYear = String(row.academicYear ?? "").trim();
      const feePlanName = String(row.feePlanName ?? "").trim();

      if (!admissionNo || !academicYear || !feePlanName) {
        errors.push({ row: rowNumber, message: "Admission number, academic year and fee plan name are required." });
        continue;
      }

      const key = [admissionNo, academicYear, feePlanName].map(normalize).join(":");
      if (seen.has(key)) {
        errors.push({ row: rowNumber, message: "Duplicate fee assignment in the import file." });
        continue;
      }

      seen.add(key);
      prepared.push({ admissionNo, academicYear, feePlanName, rowNumber });
    }

    if (errors.length > 0) {
      return ApiResponse.success(
        { created: 0, failed: errors.length, errors },
        "Fix the validation errors before importing.",
      );
    }

    const [academicYears, feePlans] = await Promise.all([
      prisma.academicYear.findMany({
        where: { schoolId: tenant.schoolId },
        select: { id: true, name: true },
      }),
      prisma.feePlan.findMany({
        where: { schoolId: tenant.schoolId },
        select: {
          id: true,
          name: true,
          academicYearId: true,
          active: true,
          appliesToAllClasses: true,
          classes: { select: { classId: true } },
        },
      }),
    ]);

    const yearByName = new Map(
      academicYears.map((year) => [normalize(year.name), year]),
    );

    const planByKey = new Map(
      feePlans.map((plan) => [
        `${plan.academicYearId}:${normalize(plan.name)}`,
        plan,
      ]),
    );

    const yearIds = [...new Set(academicYears.map((year) => year.id))];

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId: tenant.schoolId,
        active: true,
        academicYearId: { in: yearIds },
      },
      select: {
        id: true,
        academicYearId: true,
        classId: true,
        student: { select: { admissionNo: true } },
      },
    });

    const enrollmentByKey = new Map(
      enrollments.map((enrollment) => [
        `${enrollment.academicYearId}:${normalize(enrollment.student.admissionNo)}`,
        enrollment,
      ]),
    );

    let created = 0;
    const importErrors: RowError[] = [];

    for (const row of prepared) {
      const year = yearByName.get(normalize(row.academicYear));
      if (!year) {
        importErrors.push({ row: row.rowNumber, message: `Academic year not found: ${row.academicYear}.` });
        continue;
      }

      const plan = planByKey.get(`${year.id}:${normalize(row.feePlanName)}`);
      if (!plan) {
        importErrors.push({ row: row.rowNumber, message: `Fee plan not found for ${row.academicYear}: ${row.feePlanName}.` });
        continue;
      }

      if (!plan.active) {
        importErrors.push({ row: row.rowNumber, message: `Fee plan is inactive: ${row.feePlanName}.` });
        continue;
      }

      const enrollment = enrollmentByKey.get(
        `${year.id}:${normalize(row.admissionNo)}`,
      );

      if (!enrollment) {
        importErrors.push({ row: row.rowNumber, message: `Active enrollment not found for admission number ${row.admissionNo} in ${row.academicYear}.` });
        continue;
      }

      if (
        !plan.appliesToAllClasses &&
        !plan.classes.some((item) => item.classId === enrollment.classId)
      ) {
        importErrors.push({ row: row.rowNumber, message: `Fee plan ${row.feePlanName} does not apply to the student's class.` });
        continue;
      }

      const existing = await prisma.studentFee.findFirst({
        where: {
          schoolId: tenant.schoolId,
          studentEnrollmentId: enrollment.id,
          feePlanId: plan.id,
        },
        select: { id: true },
      });

      if (existing) {
        importErrors.push({ row: row.rowNumber, message: `Fee plan ${row.feePlanName} is already assigned to admission number ${row.admissionNo}.` });
        continue;
      }

      try {
        await studentFeeService.assign(tenant.schoolId, {
          studentEnrollmentId: enrollment.id,
          feePlanId: plan.id,
        });
        created += 1;
      } catch (error) {
        importErrors.push({
          row: row.rowNumber,
          message: error instanceof Error ? error.message : "Unable to assign fee plan.",
        });
      }
    }

    return ApiResponse.success(
      {
        created,
        failed: importErrors.length,
        errors: importErrors,
      },
      importErrors.length
        ? "Fee assignment import completed with row-level errors."
        : "Fee assignments imported successfully.",
    );
  });
}

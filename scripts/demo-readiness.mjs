import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

const { Client } = pg;
const connectionString = process.env.DATABASE_URL?.trim();
const schoolSlug = (process.env.DEMO_SCHOOL_SLUG || "demo").trim();
const strict = process.argv.includes("--strict");
const json = process.argv.includes("--json");

if (!connectionString) {
  throw new Error("DATABASE_URL is required to check demo readiness.");
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(schoolSlug)) {
  throw new Error("DEMO_SCHOOL_SLUG must be a lowercase URL slug.");
}

const checks = [
  {
    key: "staff",
    label: "Active staff access",
    minimum: 1,
    level: "blocker",
    next: "Add an active school administrator membership.",
  },
  {
    key: "academicYears",
    label: "Active academic year",
    minimum: 1,
    level: "blocker",
    next: "Activate the academic year used in the walkthrough.",
  },
  {
    key: "classes",
    label: "Classes",
    minimum: 2,
    level: "blocker",
    next: "Create at least two active classes.",
  },
  {
    key: "sections",
    label: "Sections",
    minimum: 2,
    level: "blocker",
    next: "Create at least two active sections.",
  },
  {
    key: "students",
    label: "Active students",
    minimum: 10,
    level: "blocker",
    next: "Import at least ten fictional students.",
  },
  {
    key: "enrollments",
    label: "Current enrollments",
    minimum: 10,
    level: "blocker",
    next: "Enroll the fictional students in the active academic year.",
  },
  {
    key: "teachers",
    label: "Teachers",
    minimum: 2,
    level: "recommended",
    next: "Add two fictional teachers for timetable and homework flows.",
  },
  {
    key: "subjects",
    label: "Subjects",
    minimum: 3,
    level: "recommended",
    next: "Add three subjects and map them to a class.",
  },
  {
    key: "classSubjects",
    label: "Class-subject mappings",
    minimum: 3,
    level: "recommended",
    next: "Map subjects to the active academic year.",
  },
  {
    key: "attendanceSessions",
    label: "Recent attendance sessions",
    minimum: 3,
    level: "recommended",
    next: "Record attendance on three recent school days.",
  },
  {
    key: "homework",
    label: "Current homework",
    minimum: 2,
    level: "recommended",
    next: "Create two current homework items.",
  },
  {
    key: "announcements",
    label: "Announcements",
    minimum: 2,
    level: "recommended",
    next: "Publish two fictional notices for the family view.",
  },
  {
    key: "studentFees",
    label: "Assigned student fees",
    minimum: 3,
    level: "recommended",
    next: "Assign a fee plan to at least three demo students.",
  },
  {
    key: "feePayments",
    label: "Successful fee payments",
    minimum: 2,
    level: "recommended",
    next: "Add fictional paid and outstanding examples.",
  },
  {
    key: "exams",
    label: "Examinations",
    minimum: 1,
    level: "recommended",
    next: "Create one exam with a schedule and sample marks.",
  },
  {
    key: "examMarks",
    label: "Student marks",
    minimum: 5,
    level: "recommended",
    next: "Enter sample marks so report views are populated.",
  },
];

const client = new Client({
  connectionString,
  application_name: "schooldb-demo-readiness",
});

await client.connect();

try {
  await client.query("BEGIN READ ONLY");
  const schoolResult = await client.query(
    `SELECT id, name, slug FROM "School" WHERE slug = $1 LIMIT 1`,
    [schoolSlug],
  );
  const school = schoolResult.rows[0];

  if (!school) {
    await client.query("COMMIT");
    const result = {
      ready: false,
      schoolSlug,
      error: `School with slug "${schoolSlug}" was not found.`,
    };
    if (json) console.log(JSON.stringify(result, null, 2));
    else console.error(`BLOCKED  ${result.error}`);
    process.exitCode = 1;
  } else {
    const countResult = await client.query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM "Membership" WHERE "schoolId" = $1 AND "isActive" = true AND role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN')) AS staff,
          (SELECT COUNT(*)::int FROM "AcademicYear" WHERE "schoolId" = $1 AND active = true) AS "academicYears",
          (SELECT COUNT(*)::int FROM "Class" WHERE "schoolId" = $1 AND active = true) AS classes,
          (SELECT COUNT(*)::int FROM "Section" s JOIN "Class" c ON c.id = s."classId" WHERE c."schoolId" = $1 AND s.active = true AND c.active = true) AS sections,
          (SELECT COUNT(*)::int FROM "Student" WHERE "schoolId" = $1 AND status = 'ACTIVE') AS students,
          (SELECT COUNT(*)::int FROM "StudentEnrollment" e JOIN "AcademicYear" y ON y.id = e."academicYearId" WHERE e."schoolId" = $1 AND e.active = true AND y.active = true) AS enrollments,
          (SELECT COUNT(*)::int FROM "Teacher" WHERE "schoolId" = $1 AND active = true) AS teachers,
          (SELECT COUNT(*)::int FROM "Subject" WHERE "schoolId" = $1 AND active = true) AS subjects,
          (SELECT COUNT(*)::int FROM "ClassSubject" cs JOIN "AcademicYear" y ON y.id = cs."academicYearId" WHERE cs."schoolId" = $1 AND cs.active = true AND y.active = true) AS "classSubjects",
          (SELECT COUNT(*)::int FROM "AttendanceSession" WHERE "schoolId" = $1 AND "attendanceDate" >= CURRENT_DATE - INTERVAL '30 days') AS "attendanceSessions",
          (SELECT COUNT(*)::int FROM "Homework" WHERE "schoolId" = $1 AND active = true AND ("dueDate" IS NULL OR "dueDate" >= CURRENT_DATE - INTERVAL '7 days')) AS homework,
          (SELECT COUNT(*)::int FROM "Announcement" WHERE "schoolId" = $1 AND archived = false AND ("expiresAt" IS NULL OR "expiresAt" >= CURRENT_TIMESTAMP)) AS announcements,
          (SELECT COUNT(*)::int FROM "StudentFee" WHERE "schoolId" = $1) AS "studentFees",
          (SELECT COUNT(*)::int FROM "FeePayment" WHERE "schoolId" = $1 AND status = 'SUCCESS') AS "feePayments",
          (SELECT COUNT(*)::int FROM "Exam" e JOIN "AcademicYear" y ON y.id = e."academicYearId" WHERE e."schoolId" = $1 AND e.active = true AND y.active = true) AS exams,
          (SELECT COUNT(*)::int FROM "StudentExamMark" m JOIN "ExamSchedule" es ON es.id = m."examScheduleId" JOIN "Exam" e ON e.id = es."examId" JOIN "AcademicYear" y ON y.id = e."academicYearId" WHERE m."schoolId" = $1 AND y.active = true) AS "examMarks"
      `,
      [school.id],
    );
    await client.query("COMMIT");

    const counts = countResult.rows[0];
    const results = checks.map((check) => ({
      ...check,
      count: Number(counts[check.key] || 0),
      passed: Number(counts[check.key] || 0) >= check.minimum,
    }));
    const blockers = results.filter(
      (check) => !check.passed && check.level === "blocker",
    );
    const recommendations = results.filter(
      (check) => !check.passed && check.level === "recommended",
    );
    const environment = {
      cashfreeSandbox: process.env.CASHFREE_ENV !== "production",
      whatsappAutomationOff:
        process.env.META_WA_AUTOMATION_ENABLED !== "true",
    };
    const environmentWarnings = [
      ...(environment.cashfreeSandbox
        ? []
        : ["CASHFREE_ENV is production; do not demonstrate a real payment."]),
      ...(environment.whatsappAutomationOff
        ? []
        : ["WhatsApp automation is enabled; demo actions may message families."]),
    ];
    const ready =
      blockers.length === 0 &&
      environmentWarnings.length === 0 &&
      (!strict || recommendations.length === 0);
    const output = {
      ready,
      strict,
      school: { name: school.name, slug: school.slug },
      checks: results,
      environment,
      environmentWarnings,
      summary: {
        passed: results.filter((check) => check.passed).length,
        total: results.length,
        blockers: blockers.length,
        recommendations: recommendations.length,
      },
    };

    if (json) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(`\nSchoolDB demo readiness: ${school.name} (/${school.slug})\n`);
      console.table(
        results.map((check) => ({
          status: check.passed
            ? "READY"
            : check.level === "blocker"
              ? "BLOCKED"
              : "IMPROVE",
          area: check.label,
          found: check.count,
          target: check.minimum,
        })),
      );
      for (const warning of environmentWarnings) {
        console.error(`SAFETY   ${warning}`);
      }
      for (const check of [...blockers, ...recommendations]) {
        console.log(`${check.level === "blocker" ? "FIX" : "TIP"}      ${check.next}`);
      }
      console.log(
        `\n${ready ? "READY" : "NOT READY"}: ${output.summary.passed}/${output.summary.total} content checks passed, ${blockers.length} blocker(s), ${recommendations.length} recommendation(s).`,
      );
    }

    if (!ready) process.exitCode = 1;
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

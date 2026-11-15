import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL?.trim();
const schoolSlug = (process.env.DEMO_SCHOOL_SLUG || "demo").trim();
const apply = process.argv.includes("--apply");
const allowRemote = process.argv.includes("--allow-remote");

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed demo data.");
}

const databaseUrl = new URL(connectionString);
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
if (!allowRemote && !localHosts.has(databaseUrl.hostname)) {
  throw new Error(
    "Refusing to seed a remote database. Use --allow-remote only after verifying the target.",
  );
}

if (!apply) {
  console.log(
    `Plan only: seed fictional readiness data for /${schoolSlug}. Re-run with --apply to write it.`,
  );
  process.exit(0);
}

const pool = new Pool({
  connectionString,
  application_name: "schooldb-demo-seed",
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function utcDate(daysFromToday = 0) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday),
  );
}

try {
  const summary = await prisma.$transaction(async (tx) => {
    const school = await tx.school.findUnique({ where: { slug: schoolSlug } });
    if (!school) throw new Error(`School with slug "${schoolSlug}" was not found.`);

    const academicYear = await tx.academicYear.findFirst({
      where: { schoolId: school.id, active: true },
      orderBy: { startDate: "desc" },
    });
    if (!academicYear) throw new Error("The demo school has no active academic year.");

    const selectedClass = await tx.class.findFirst({
      where: { schoolId: school.id, active: true, sections: { some: { active: true } } },
      include: { sections: { where: { active: true }, orderBy: { displayOrder: "asc" } } },
      orderBy: { displayOrder: "asc" },
    });
    if (!selectedClass || selectedClass.sections.length === 0) {
      throw new Error("The demo school needs an active class with an active section.");
    }
    const section = selectedClass.sections[0];

    const subjects = await tx.subject.findMany({
      where: { schoolId: school.id, active: true },
      orderBy: { displayOrder: "asc" },
      take: 3,
    });
    if (subjects.length < 3) throw new Error("The demo school needs three active subjects.");

    const teacher = await tx.teacher.findFirst({
      where: { schoolId: school.id, active: true },
      orderBy: { fullName: "asc" },
    });

    const existingRoll = await tx.studentEnrollment.aggregate({
      where: {
        academicYearId: academicYear.id,
        classId: selectedClass.id,
        sectionId: section.id,
      },
      _max: { rollNo: true },
    });
    let nextRoll = (existingRoll._max.rollNo || 0) + 1;
    const enrollments = [];

    for (let index = 1; index <= 10; index += 1) {
      const suffix = String(index).padStart(2, "0");
      const admissionNo = `DEMO-${suffix}`;
      let student = await tx.student.findFirst({
        where: { schoolId: school.id, admissionNo },
      });
      if (!student) {
        student = await tx.student.create({
          data: {
            schoolId: school.id,
            admissionNo,
            fullName: `Demo Student ${suffix}`,
            gender: index % 2 === 0 ? "FEMALE" : "MALE",
            dob: new Date(Date.UTC(2013 + (index % 3), index % 12, Math.min(index, 28))),
            joinedDate: academicYear.startDate,
            remarks: "Fictional record created by the demo readiness seeder.",
            whatsappOptIn: false,
          },
        });
      }

      let enrollment = await tx.studentEnrollment.findFirst({
        where: { studentId: student.id, academicYearId: academicYear.id },
      });
      if (!enrollment) {
        enrollment = await tx.studentEnrollment.create({
          data: {
            schoolId: school.id,
            studentId: student.id,
            academicYearId: academicYear.id,
            classId: selectedClass.id,
            sectionId: section.id,
            rollNo: nextRoll,
            admissionDate: academicYear.startDate,
            active: true,
          },
        });
        nextRoll += 1;
      }
      enrollments.push(enrollment);
    }

    for (const subject of subjects) {
      const mapping = await tx.classSubject.findFirst({
        where: {
          academicYearId: academicYear.id,
          classId: selectedClass.id,
          subjectId: subject.id,
        },
      });
      if (!mapping) {
        await tx.classSubject.create({
          data: {
            schoolId: school.id,
            academicYearId: academicYear.id,
            classId: selectedClass.id,
            subjectId: subject.id,
          },
        });
      }
    }

    for (let offset = 1; offset <= 3; offset += 1) {
      const remarks = `DEMO-SEED attendance ${offset}`;
      let session = await tx.attendanceSession.findFirst({
        where: { schoolId: school.id, remarks },
      });
      if (!session) {
        session = await tx.attendanceSession.create({
          data: {
            schoolId: school.id,
            academicYearId: academicYear.id,
            teacherId: teacher?.id,
            classId: selectedClass.id,
            sectionId: section.id,
            attendanceDate: utcDate(-offset),
            sessionType: "DAILY",
            remarks,
            locked: true,
          },
        });
      }
      for (const enrollment of enrollments) {
        const record = await tx.attendance.findFirst({
          where: { sessionId: session.id, studentId: enrollment.studentId },
        });
        if (!record) {
          await tx.attendance.create({
            data: {
              schoolId: school.id,
              sessionId: session.id,
              studentId: enrollment.studentId,
              status: "PRESENT",
              remarks: "Fictional demo attendance.",
            },
          });
        }
      }
    }

    const homeworkTitles = ["Demo: Reading practice", "Demo: Mathematics review"];
    for (const [index, title] of homeworkTitles.entries()) {
      const existing = await tx.homework.findFirst({ where: { schoolId: school.id, title } });
      if (!existing) {
        await tx.homework.create({
          data: {
            schoolId: school.id,
            academicYearId: academicYear.id,
            teacherId: teacher?.id,
            subjectId: subjects[index].id,
            classId: selectedClass.id,
            sectionId: section.id,
            title,
            description: "Fictional homework created for the SchoolDB demo.",
            assignedDate: utcDate(0),
            dueDate: utcDate(index + 3),
          },
        });
      }
    }

    const receiptNo = "DEMO-RECEIPT-001";
    const payment = await tx.feePayment.findFirst({
      where: { schoolId: school.id, receiptNo },
    });
    if (!payment) {
      await tx.feePayment.create({
        data: {
          schoolId: school.id,
          studentEnrollmentId: enrollments[0].id,
          receiptNo,
          paymentDate: utcDate(-2),
          amount: "500.00",
          paymentMode: "CASH",
          status: "SUCCESS",
          remarks: "Fictional demo payment; no external payment was processed.",
        },
      });
    }

    const examName = "Demo Assessment";
    let exam = await tx.exam.findFirst({
      where: { schoolId: school.id, academicYearId: academicYear.id, name: examName },
    });
    if (!exam) {
      exam = await tx.exam.create({
        data: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          name: examName,
          startDate: utcDate(-7),
          endDate: utcDate(-7),
          status: "PUBLISHED",
        },
      });
    }

    let schedule = await tx.examSchedule.findFirst({
      where: {
        examId: exam.id,
        classId: selectedClass.id,
        sectionId: section.id,
        subjectId: subjects[0].id,
      },
    });
    if (!schedule) {
      schedule = await tx.examSchedule.create({
        data: {
          schoolId: school.id,
          examId: exam.id,
          classId: selectedClass.id,
          sectionId: section.id,
          subjectId: subjects[0].id,
          examDate: utcDate(-7),
          startTime: "09:30",
          endTime: "10:30",
          maxMarks: "100.00",
          passMarks: "35.00",
        },
      });
    }

    for (const [index, enrollment] of enrollments.slice(0, 5).entries()) {
      const mark = await tx.studentExamMark.findFirst({
        where: { examScheduleId: schedule.id, studentEnrollmentId: enrollment.id },
      });
      if (!mark) {
        await tx.studentExamMark.create({
          data: {
            schoolId: school.id,
            examScheduleId: schedule.id,
            studentEnrollmentId: enrollment.id,
            marksObtained: String(72 + index * 3),
            status: "PRESENT",
            remarks: "Fictional demo mark.",
          },
        });
      }
    }

    return {
      school: school.slug,
      students: enrollments.length,
      class: selectedClass.name,
      section: section.name,
      subjects: subjects.map((subject) => subject.name),
    };
  });

  console.log("Demo readiness data seeded without notifications or external payments.");
  console.table(summary);
} finally {
  await prisma.$disconnect();
  await pool.end();
}

import { prisma } from "@/lib/prisma";

export const studentExamService = {
  listSchedule(
    schoolId: string,
    enrollment: {
      academicYearId: string;
      classId: string;
      sectionId: string;
    },
  ) {
    return prisma.examSchedule.findMany({
      where: {
        schoolId,
        classId: enrollment.classId,
        OR: [{ sectionId: enrollment.sectionId }, { sectionId: null }],
        exam: {
          academicYearId: enrollment.academicYearId,
          active: true,
          status: { in: ["PUBLISHED", "COMPLETED"] },
        },
      },
      select: {
        id: true,
        examDate: true,
        startTime: true,
        endTime: true,
        maxMarks: true,
        passMarks: true,
        subject: { select: { id: true, name: true, code: true } },
        exam: {
          select: { id: true, name: true, status: true, startDate: true, endDate: true },
        },
      },
      orderBy: [{ examDate: "asc" }, { startTime: "asc" }],
    });
  },

  async listResults(
    schoolId: string,
    enrollment: {
      id: string;
      academicYearId: string;
      classId: string;
      sectionId: string;
    },
  ) {
    const exams = await prisma.exam.findMany({
      where: {
        schoolId,
        academicYearId: enrollment.academicYearId,
        active: true,
        status: "COMPLETED",
        schedules: {
          some: {
            classId: enrollment.classId,
            OR: [{ sectionId: enrollment.sectionId }, { sectionId: null }],
          },
        },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        schedules: {
          where: {
            classId: enrollment.classId,
            OR: [{ sectionId: enrollment.sectionId }, { sectionId: null }],
          },
          orderBy: { examDate: "asc" },
          select: {
            id: true,
            examDate: true,
            maxMarks: true,
            passMarks: true,
            subject: { select: { id: true, name: true, code: true } },
            marks: {
              where: { studentEnrollmentId: enrollment.id },
              take: 1,
              select: {
                marksObtained: true,
                status: true,
                remarks: true,
              },
            },
          },
        },
      },
      orderBy: [{ startDate: "desc" }, { name: "asc" }],
    });

    return exams.map((exam) => {
      let obtained = 0;
      let maximum = 0;
      let pending = false;
      let failed = false;

      const subjects = exam.schedules.map((schedule) => {
        const mark = schedule.marks[0] ?? null;
        const maxMarks = Number(schedule.maxMarks);
        const passMarks =
          schedule.passMarks === null ? null : Number(schedule.passMarks);
        const marksObtained =
          mark?.marksObtained === null || mark?.marksObtained === undefined
            ? null
            : Number(mark.marksObtained);

        let status: "PENDING" | "PASS" | "FAIL" | "ABSENT" | "EXEMPTED";

        if (!mark) {
          status = "PENDING";
          pending = true;
          maximum += maxMarks;
        } else if (mark.status === "ABSENT") {
          status = "ABSENT";
          failed = true;
          maximum += maxMarks;
        } else if (mark.status === "EXEMPTED") {
          status = "EXEMPTED";
        } else {
          const value = marksObtained ?? 0;
          obtained += value;
          maximum += maxMarks;
          status = passMarks === null || value >= passMarks ? "PASS" : "FAIL";
          failed ||= status === "FAIL";
        }

        return {
          id: schedule.id,
          subject: schedule.subject,
          examDate: schedule.examDate,
          marksObtained,
          maxMarks,
          passMarks,
          status,
          remarks: mark?.remarks ?? null,
        };
      });

      const status: "PENDING" | "FAIL" | "PASS" = pending
        ? "PENDING"
        : failed
          ? "FAIL"
          : "PASS";

      return {
        id: exam.id,
        name: exam.name,
        startDate: exam.startDate,
        endDate: exam.endDate,
        obtained,
        maximum,
        percentage:
          maximum > 0 ? Number(((obtained / maximum) * 100).toFixed(2)) : 0,
        status,
        subjects,
      };
    });
  },
};

import { Prisma } from "@/generated/prisma/client";

import { timetableRepository } from "@/features/timetable/repositories/timetable.repository";

import {
  AttendanceFormOutput
} from "../schemas/attendance.schema";

import {
  AttendanceSessionFormOutput,
} from "../schemas/attendance-session.schema";

import { attendanceRepository } from "../repositories/attendance.repository";
import { calculateAttendance } from "./attendance-calculator";
import { academicYearRepository } from "@/features/academic-years/repositories/academic-year.repository";



export const attendanceService = {
  async list(
    schoolId: string,
    query: {
      page: number;
      pageSize: number;
      search?: string;
    }
  ) {
    const skip =
      (query.page - 1) * query.pageSize;

    const where: Prisma.AttendanceWhereInput = {
      schoolId,

      ...(query.search && {
        student: {
          OR: [
            {
              fullName: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              admissionNo: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        },
      }),
    };

    const [data, total] =
      await Promise.all([
        attendanceRepository.list(where, {
          skip,
          take: query.pageSize,
        }),

        attendanceRepository.count(where),
      ]);

    return {
      data,

      total,

      page: query.page,

      pageSize: query.pageSize,

      totalPages: Math.ceil(
        total / query.pageSize
      ),
    };
  },

  async get(
    id: string,
    schoolId: string
  ) {
    const attendance =
      await attendanceRepository.get(
        id,
        schoolId
      );

    if (!attendance) {
      throw new Error(
        "Attendance not found."
      );
    }

    return attendance;
  },

  async createSession(
  schoolId: string,
  input: AttendanceSessionFormOutput
) {
  if (input.sessionType === "PERIOD") {
    if (!input.timetableId) {
      throw new Error(
        "Timetable is required for period attendance."
      );
    }

    const timetable =
      await timetableRepository.getAttendanceInfo(
        input.timetableId,
        schoolId
      );

    if (!timetable) {
      throw new Error(
        "Timetable not found."
      );
    }

    const allocation =
      timetable.teacherAllocation;

    const session =
      await attendanceRepository.findSession(
        schoolId,
        allocation.academicYearId,
        allocation.classId,
        allocation.sectionId,
        timetable.periodId,
        new Date(input.attendanceDate)
      );

    if (session) {
      return session;
    }

    return attendanceRepository.createSession({
      school: {
        connect: {
          id: schoolId,
        },
      },

      academicYear: {
        connect: {
          id: allocation.academicYearId,
        },
      },

      teacher: {
        connect: {
          id: allocation.teacherId,
        },
      },

      subject: {
        connect: {
          id: allocation.subjectId,
        },
      },

      class: {
        connect: {
          id: allocation.classId,
        },
      },

      section: {
        connect: {
          id: allocation.sectionId,
        },
      },

      period: {
        connect: {
          id: timetable.periodId,
        },
      },

      sessionType: "PERIOD",

      attendanceDate: new Date(
        input.attendanceDate
      ),

      remarks: input.remarks,
    });
  }

  if (
  input.sessionType === "DAILY" ||
  input.sessionType === "MORNING" ||
  input.sessionType === "AFTERNOON"
) {
  const session =
    await attendanceRepository.findSessionByType(
      schoolId,
      input.academicYearId,
      input.classId,
      input.sectionId,
      input.sessionType,
      new Date(input.attendanceDate)
    );

  if (session) {
    return session;
  }

  return attendanceRepository.createSession({
    school: {
      connect: {
        id: schoolId,
      },
    },

    academicYear: {
      connect: {
        id: input.academicYearId,
      },
    },

    class: {
      connect: {
        id: input.classId,
      },
    },

    section: {
      connect: {
        id: input.sectionId,
      },
    },

    sessionType: input.sessionType,

    attendanceDate: new Date(
      input.attendanceDate
    ),

    remarks: input.remarks,
  });
}
  throw new Error(
    `Attendance session type ${input.sessionType} is not implemented yet.`
  );
},

  async markAttendance(
  schoolId: string,
  input: AttendanceFormOutput
) {
  return attendanceRepository.bulkMarkAttendance(
    schoolId,
    input
  );
},

  async studentAttendance(
    schoolId: string,
    studentId: string
  ) {
    return attendanceRepository.studentAttendance(
      schoolId,
      studentId
    );
  },

  async classAttendance(
    schoolId: string,
    classId: string,
    sectionId: string
  ) {
    return attendanceRepository.classAttendance(
      schoolId,
      classId,
      sectionId
    );
  },

  async todayAttendance(
    schoolId: string
  ) {
    return attendanceRepository.todayAttendance(
      schoolId,
      new Date()
    );
  },


async getSession(
  schoolId: string,
  sessionId: string
) {
  const session =
    await attendanceRepository.getSessionStudents(
      schoolId,
      sessionId
    );

  if (!session) {
    throw new Error(
      "Attendance session not found."
    );
  }

  const enrollments =
  await attendanceRepository.getAttendanceStudents(
    schoolId,
    session.academicYearId,
    session.classId,
    session.sectionId
  );

  const students = enrollments.map((enrollment) => {
  const attendance = session.records.find(
    (record) =>
      record.studentId === enrollment.studentId
  );

  return {
    studentId: enrollment.studentId,

    rollNo: enrollment.rollNo ?? 0,

    admissionNo: enrollment.student.admissionNo,

    fullName: enrollment.student.fullName,

    status: attendance?.status ?? "PRESENT",

    remarks: attendance?.remarks ?? "",
  };
});

  return {
    session,

    students,
  };
},

async listSessions(
  schoolId: string,
  query: {
    page: number;
    pageSize: number;
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
    date?: string;
  }
) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;

  const date = query.date
    ? new Date(query.date)
    : undefined;

  const options = {
    academicYearId:
      query.academicYearId || undefined,

    classId:
      query.classId || undefined,

    sectionId:
      query.sectionId || undefined,

    date,
  };

  const [sessions, total] =
    await Promise.all([
      attendanceRepository.listSessions(
        schoolId,
        {
          ...options,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }
      ),

      attendanceRepository.countSessions(
        schoolId,
        options
      ),
    ]);

  const data = sessions.map((session) => {
    const present =
      session.records.filter(
        (record) =>
          record.status === "PRESENT"
      ).length;

    const absent =
      session.records.filter(
        (record) =>
          record.status === "ABSENT"
      ).length;

    const late =
      session.records.filter(
        (record) =>
          record.status === "LATE"
      ).length;

    const leave =
      session.records.filter(
        (record) =>
          record.status === "LEAVE"
      ).length;

    return {
      id: session.id,

      attendanceDate:
        session.attendanceDate,

      sessionType:
        session.sessionType,

      academicYearId:
        session.academicYearId,

      academicYearName:
        session.academicYear.name,

      classId:
        session.classId,

      className:
        session.class.name,

      sectionId:
        session.sectionId,

      sectionName:
        session.section.name,

      teacherName:
        session.teacher?.fullName ?? null,

      subjectName:
        session.subject?.name ?? null,

      periodName:
        session.period?.name ?? null,

      totalStudents:
        session.records.length,

      present,
      absent,
      late,
      leave,

      completed:
        session.records.length > 0,
    };
  });

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(
      total / pageSize
    ),
  };
},


async studentAttendanceReport(
  schoolId: string,
  studentId: string,
  academicYearId: string,
  fromDate?: string,
  toDate?: string
) {
  const academicYear =
    await academicYearRepository.findById(
      academicYearId,
      schoolId
    );

  if (!academicYear) {
    throw new Error(
      "Academic year not found."
    );
  }

  const records =
    await attendanceRepository.studentAttendanceReport(
      schoolId,
      studentId,
      academicYearId,
      fromDate
        ? new Date(`${fromDate}T00:00:00`)
        : undefined,
      toDate
        ? new Date(`${toDate}T23:59:59.999`)
        : undefined
    );

  const summary = calculateAttendance(
    records,
    academicYear.attendanceMode
  );

  return {
    summary,
    records,
  };
},

async classAttendanceReport(
  schoolId: string,
  academicYearId: string,
  classId: string,
  sectionId: string,
  fromDate?: string,
  toDate?: string
) {
  const academicYear =
    await academicYearRepository.findById(
      academicYearId,
      schoolId
    );

  if (!academicYear) {
    throw new Error(
      "Academic year not found."
    );
  }

  const result =
    await attendanceRepository.classAttendanceReport(
      schoolId,
      academicYearId,
      classId,
      sectionId,
      fromDate
        ? new Date(`${fromDate}T00:00:00`)
        : undefined,
      toDate
        ? new Date(`${toDate}T23:59:59.999`)
        : undefined
    );

  const students =
    result.enrollments.map((enrollment) => {
      const records =
        result.records.filter(
          (record) =>
            record.studentId ===
            enrollment.studentId
        );

      const summary =
        calculateAttendance(
          records,
          academicYear.attendanceMode
        );

      return {
        studentId:
          enrollment.studentId,

        rollNo:
          enrollment.rollNo,

        admissionNo:
          enrollment.student.admissionNo,

        fullName:
          enrollment.student.fullName,

        total: summary.total,

        present: summary.present,

        absent: summary.absent,

        late: summary.late,

        leave: summary.leave,

        attendancePercentage:
          summary.attendancePercentage,
      };
    });

  /*
   * Class-level totals
   *
   * We add the individual student
   * opportunities because each student
   * has their own attendance denominator.
   */

  const totalSessions =
    students.reduce(
      (sum, student) =>
        sum + student.total,
      0
    );

  const present =
    students.reduce(
      (sum, student) =>
        sum + student.present,
      0
    );

  const absent =
    students.reduce(
      (sum, student) =>
        sum + student.absent,
      0
    );

  const late =
    students.reduce(
      (sum, student) =>
        sum + student.late,
      0
    );

  const leave =
    students.reduce(
      (sum, student) =>
        sum + student.leave,
      0
    );

  const attendancePercentage =
    totalSessions > 0
      ? Number(
          (
            (present /
              totalSessions) *
            100
          ).toFixed(2)
        )
      : 0;

  return {
    summary: {
      totalStudents:
        students.length,

      totalSessions,

      present,

      absent,

      late,

      leave,

      attendancePercentage,
    },

    students,
  };
},

async lowAttendanceReport(
  schoolId: string,
  academicYearId: string,
  classId?: string,
  sectionId?: string,
  fromDate?: string,
  toDate?: string,
  threshold = 75
) {
  const academicYear =
    await academicYearRepository.findById(
      academicYearId,
      schoolId
    );

  if (!academicYear) {
    throw new Error(
      "Academic year not found."
    );
  }

  const enrollments =
    await attendanceRepository.lowAttendanceReport(
      schoolId,
      academicYearId,
      classId,
      sectionId
    );

  const results = await Promise.all(
    enrollments.map(async (enrollment) => {
      const records =
        await attendanceRepository.studentAttendanceReport(
          schoolId,
          enrollment.studentId,
          academicYearId,
          fromDate
            ? new Date(`${fromDate}T00:00:00`)
            : undefined,
          toDate
            ? new Date(`${toDate}T23:59:59.999`)
            : undefined
        );

      const summary =
        calculateAttendance(
          records,
          academicYear.attendanceMode
        );

      return {
        studentId:
          enrollment.studentId,

        rollNo:
          enrollment.rollNo,

        admissionNo:
          enrollment.student.admissionNo,

        fullName:
          enrollment.student.fullName,

        total:
          summary.total,

        present:
          summary.present,

        absent:
          summary.absent,

        late:
          summary.late,

        leave:
          summary.leave,

        attendancePercentage:
          summary.attendancePercentage,
      };
    })
  );

  const lowAttendance =
    results.filter(
      (student) =>
        student.attendancePercentage <
        threshold
    );

  return {
    threshold,

    totalStudents:
      results.length,

    lowAttendanceCount:
      lowAttendance.length,

    students: lowAttendance,
  };
},
};
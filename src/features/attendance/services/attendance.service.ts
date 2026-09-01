import { AttendanceStatus, Prisma } from "@/generated/prisma/client";

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

      completed: session.locked,
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

  /*
   * Group all attendance records by student.
   *
   * Before:
   *   records.filter() was executed for
   *   every student.
   *
   * Now:
   *   We build the map once and directly
   *   retrieve each student's records.
   */
  const recordsByStudent =
    new Map<
      string,
      typeof result.records
    >();

  for (const record of result.records) {
    const existing =
      recordsByStudent.get(
        record.studentId
      ) ?? [];

    existing.push(record);

    recordsByStudent.set(
      record.studentId,
      existing
    );
  }

  /*
   * Calculate each student's attendance.
   */
  const students =
    result.enrollments.map((enrollment) => {
      const records =
        recordsByStudent.get(
          enrollment.studentId
        ) ?? [];

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
    });

  /*
   * Class-level totals.
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
  threshold = 75,
) {
  const academicYear =
    await academicYearRepository.findById(
      academicYearId,
      schoolId,
    );

  if (!academicYear) {
    throw new Error(
      "Academic year not found.",
    );
  }

  /*
   * Get all active/enrolled students matching
   * the optional class and section filters.
   */
  const enrollments =
    await attendanceRepository.lowAttendanceReport(
      schoolId,
      academicYearId,
      classId,
      sectionId,
    );

  if (enrollments.length === 0) {
    return {
      threshold,
      totalStudents: 0,
      lowAttendanceCount: 0,
      students: [],
    };
  }

  const studentIds =
    enrollments.map(
      (enrollment) => enrollment.studentId,
    );

  /*
   * Fetch all attendance records in one query.
   */
  const records =
    await attendanceRepository.lowAttendanceRecords(
      schoolId,
      academicYearId,
      studentIds,
      fromDate
        ? new Date(`${fromDate}T00:00:00`)
        : undefined,
      toDate
        ? new Date(`${toDate}T23:59:59.999`)
        : undefined,
    );

  /*
   * Group records by student.
   */
  const recordsByStudent =
    new Map<string, typeof records>();

  for (const record of records) {
    const studentRecords =
      recordsByStudent.get(record.studentId) ?? [];

    studentRecords.push(record);

    recordsByStudent.set(
      record.studentId,
      studentRecords,
    );
  }

  /*
   * Calculate attendance for every enrolled student.
   */
  const results =
    enrollments.map((enrollment) => {
      const studentRecords =
        recordsByStudent.get(
          enrollment.studentId,
        ) ?? [];

      const summary =
        calculateAttendance(
          studentRecords,
          academicYear.attendanceMode,
        );

      return {
        studentId: enrollment.studentId,
        rollNo: enrollment.rollNo,
        admissionNo: enrollment.student.admissionNo,
        fullName: enrollment.student.fullName,

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
   * Only students below the selected threshold.
   *
   * Example:
   * Threshold = 75
   * 74.99 = included
   * 75.00 = not included
   */
  const lowAttendance =
    results
      .filter(
        (student) =>
          student.attendancePercentage < threshold,
      )
      .sort(
  (a, b) =>
    a.attendancePercentage -
      b.attendancePercentage ||
    (a.fullName ?? "").localeCompare(b.fullName ?? ""),
);

  return {
    threshold,

    totalStudents: results.length,

    lowAttendanceCount:
      lowAttendance.length,

    students: lowAttendance,
  };
},

async updateAttendance(
  schoolId: string,
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
  remarks?: string,
) {
  const session =
    await attendanceRepository.findSessionForCorrection(
      sessionId,
      schoolId,
    );

  if (!session) {
    throw new Error(
      "Attendance session not found.",
    );
  }

  if (session.locked) {
    throw new Error(
      "Attendance session is locked and cannot be modified.",
    );
  }

  return attendanceRepository.updateAttendance(
    sessionId,
    studentId,
    schoolId,
    {
      status,
      remarks,
    },
  );
},

async bulkUpdateAttendance(
  schoolId: string,
  sessionId: string,
  changes: {
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }[],
) {
  const session =
    await attendanceRepository.findSessionForCorrection(
      sessionId,
      schoolId,
    );

  if (!session) {
    throw new Error(
      "Attendance session not found.",
    );
  }

  if (session.locked) {
    throw new Error(
      "Attendance session is locked and cannot be modified.",
    );
  }

  return attendanceRepository.bulkUpdateAttendance(
    sessionId,
    schoolId,
    changes,
  );
},

async lockAttendanceSession(
  schoolId: string,
  sessionId: string,
) {
  const session =
    await attendanceRepository.findSessionForCorrection(
      sessionId,
      schoolId,
    );

  if (!session) {
    throw new Error(
      "Attendance session not found.",
    );
  }

  if (session.locked) {
    throw new Error(
      "Attendance session is already locked.",
    );
  }

  const result =
    await attendanceRepository.lockSession(
      sessionId,
      schoolId,
    );

  if (result.count === 0) {
    throw new Error(
      "Attendance session could not be locked.",
    );
  }

  return {
    id: sessionId,
    locked: true,
  };
},

async dashboard(
  schoolId: string,
) {
  const academicYear =
    await academicYearRepository.getCurrent(
      schoolId,
    );

  if (!academicYear) {
    throw new Error(
      "No active academic year found.",
    );
  }

  const [
    enrollments,
    sessions,
    attendanceRecords,
  ] =
    await attendanceRepository.dashboardData(
      schoolId,
      academicYear.id,
    );

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);

  tomorrow.setDate(
    tomorrow.getDate() + 1,
  );

  /*
   * Today's attendance records.
   *
   * We use the session relation because
   * attendanceDate belongs to the session.
   */
  const todaySessions =
  await attendanceRepository.todayAttendanceSessions(
    schoolId,
    academicYear.id,
    today,
    tomorrow,
  );

const todayRecords =
  await attendanceRepository.attendanceBySessions(
    schoolId,
    todaySessions.map(
      (session) => session.id,
    ),
  );

  const present =
    todayRecords.filter(
      (record) =>
        record.status === "PRESENT",
    ).length;

  const absent =
    todayRecords.filter(
      (record) =>
        record.status === "ABSENT",
    ).length;

  const late =
    todayRecords.filter(
      (record) =>
        record.status === "LATE",
    ).length;

  const leave =
    todayRecords.filter(
      (record) =>
        record.status === "LEAVE",
    ).length;

  const totalMarked =
    todayRecords.length;

  const attendancePercentage =
    totalMarked > 0
      ? Number(
          (
            ((present + late) /
              totalMarked) *
            100
          ).toFixed(2),
        )
      : 0;

  /*
   * Recent sessions.
   */
  const recentSessions =
    sessions.map((session) => {
      const records = session.records;

      const sessionPresent =
        records.filter(
          (record) =>
            record.status === "PRESENT",
        ).length;

      const sessionAbsent =
        records.filter(
          (record) =>
            record.status === "ABSENT",
        ).length;

      return {
        id: session.id,

        attendanceDate:
          session.attendanceDate,

        sessionType:
          session.sessionType,

        className:
          session.class.name,

        sectionName:
          session.section.name,

        totalStudents:
          records.length,

        present:
          sessionPresent,

        absent:
          sessionAbsent,

        completed: session.locked,
      };
    });

  /*
   * Calculate low attendance using
   * all available records in the
   * active academic year.
   */
  const recordsByStudent =
    new Map<
      string,
      typeof attendanceRecords
    >();

  for (const record of attendanceRecords) {
    const existing =
      recordsByStudent.get(
        record.studentId,
      ) ?? [];

    existing.push(record);

    recordsByStudent.set(
      record.studentId,
      existing,
    );
  }

  const threshold = 75;

  let lowAttendanceCount = 0;

  for (const enrollment of enrollments) {
    const studentRecords =
      recordsByStudent.get(
        enrollment.studentId,
      ) ?? [];

    if (studentRecords.length === 0) {
      continue;
    }

    const summary =
      calculateAttendance(
        studentRecords,
        academicYear.attendanceMode,
      );

    if (
      summary.attendancePercentage <
      threshold
    ) {
      lowAttendanceCount++;
    }
  }

  return {
    summary: {
      totalStudents:
        enrollments.length,

      present,
      absent,
      late,
      leave,

      attendancePercentage,
    },

    recentSessions,

    alerts: {
      lowAttendanceCount,
      threshold,
    },
  };
},

async markFullPresent(
  schoolId: string,
  input: {
    academicYearId: string;
    attendanceDate: string;
    scope:
      | "SCHOOL"
      | "CLASS"
      | "SECTION";
    classId?: string;
    sectionId?: string;
  },
) {
  /*
   * ------------------------------------------------------------------------
   * Validate scope
   * ------------------------------------------------------------------------
   */

  if (
    input.scope === "CLASS" &&
    !input.classId
  ) {
    throw new Error(
      "Class is required.",
    );
  }

  if (
    input.scope === "SECTION" &&
    (!input.classId ||
      !input.sectionId)
  ) {
    throw new Error(
      "Class and section are required.",
    );
  }

  /*
   * ------------------------------------------------------------------------
   * Validate academic year
   * ------------------------------------------------------------------------
   */

  const academicYear =
    await academicYearRepository.findById(
      input.academicYearId,
      schoolId,
    );

  if (!academicYear) {
    throw new Error(
      "Academic year not found.",
    );
  }

  /*
   * ------------------------------------------------------------------------
   * Build enrollment filters
   * ------------------------------------------------------------------------
   *
   * SCHOOL
   *   → all active enrollments
   *
   * CLASS
   *   → all active enrollments in selected class
   *
   * SECTION
   *   → all active enrollments in selected class + section
   */

  const filters = {
    ...(input.scope !== "SCHOOL" &&
    input.classId
      ? {
          classId: input.classId,
        }
      : {}),

    ...(input.scope === "SECTION" &&
    input.sectionId
      ? {
          sectionId: input.sectionId,
        }
      : {}),
  };

  const attendanceDate =
    new Date(input.attendanceDate);

  /*
   * ------------------------------------------------------------------------
   * ONCE DAILY
   * ------------------------------------------------------------------------
   *
   * One DAILY session is created for every
   * class + section represented in the
   * selected scope.
   */

  if (
    academicYear.attendanceMode ===
    "ONCE_DAILY"
  ) {
    return attendanceRepository.markFullPresent(
      schoolId,
      input.academicYearId,
      attendanceDate,
      "DAILY",
      filters,
    );
  }

  /*
   * ------------------------------------------------------------------------
   * MORNING + AFTERNOON
   * ------------------------------------------------------------------------
   *
   * Full Present must populate BOTH sessions.
   */

  if (
    academicYear.attendanceMode ===
    "MORNING_AFTERNOON"
  ) {
    const morning =
      await attendanceRepository.markFullPresent(
        schoolId,
        input.academicYearId,
        attendanceDate,
        "MORNING",
        filters,
      );

    const afternoon =
      await attendanceRepository.markFullPresent(
        schoolId,
        input.academicYearId,
        attendanceDate,
        "AFTERNOON",
        filters,
      );

    return {
      sessionCount:
        morning.sessionCount +
        afternoon.sessionCount,

      attendanceCount:
        morning.attendanceCount +
        afternoon.attendanceCount,
    };
  }

  /*
   * ------------------------------------------------------------------------
   * EVERY PERIOD
   * ------------------------------------------------------------------------
   *
   * The repository must find today's timetable
   * periods and create/populate a PERIOD session
   * for each applicable class + section + period.
   */

  if (
    academicYear.attendanceMode ===
    "EVERY_PERIOD"
  ) {
    return attendanceRepository.markFullPresentForPeriods(
      schoolId,
      input.academicYearId,
      attendanceDate,
      filters,
    );
  }

  throw new Error(
    "Unsupported attendance mode.",
  );
}
};
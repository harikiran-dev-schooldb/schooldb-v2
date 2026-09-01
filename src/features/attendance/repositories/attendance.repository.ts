import {
  Prisma,
  AttendanceStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { WeekDay } from "@/generated/prisma/enums";

const attendanceInclude = {
  student: true,

  session: {
    include: {
      teacher: true,
      subject: true,
      class: true,
      section: true,
      period: true,
      academicYear: true,
    },
  },
} satisfies Prisma.AttendanceInclude;

export const attendanceRepository = {
  list(
    where: Prisma.AttendanceWhereInput,
    options?: {
      skip?: number;
      take?: number;
    }
  ) {
    return prisma.attendance.findMany({
      where,

      include: attendanceInclude,

      skip: options?.skip,

      take: options?.take,

      orderBy: [
        {
          session: {
            attendanceDate: "desc",
          },
        },
        {
          student: {
            fullName: "asc",
          },
        },
      ],
    });
  },

  count(
    where: Prisma.AttendanceWhereInput
  ) {
    return prisma.attendance.count({
      where,
    });
  },

  get(
    id: string,
    schoolId: string
  ) {
    return prisma.attendance.findFirst({
      where: {
        id,
        schoolId,
      },

      include: attendanceInclude,
    });
  },

  createSession(
    data: Prisma.AttendanceSessionCreateInput
  ) {
    return prisma.attendanceSession.create({
      data,

      include: {
        teacher: true,
        subject: true,
        class: true,
        section: true,
        period: true,
        academicYear: true,
      },
    });
  },

  findSession(
    schoolId: string,
    academicYearId: string,
    classId: string,
    sectionId: string,
    periodId: string,
    attendanceDate: Date
  ) {
    return prisma.attendanceSession.findFirst({
      where: {
        schoolId,
        academicYearId,
        classId,
        sectionId,
        periodId,
        attendanceDate,
      },
    });
  },

  markAttendance(
    data: Prisma.AttendanceCreateInput
  ) {
    return prisma.attendance.create({
      data,

      include: attendanceInclude,
    });
  },

  delete(
    id: string,
    schoolId: string
  ) {
    return prisma.attendance.delete({
      where: {
        id,
        schoolId,
      },
    });
  },

  studentAttendance(
    schoolId: string,
    studentId: string
  ) {
    return prisma.attendance.findMany({
      where: {
        schoolId,
        studentId,
      },

      include: attendanceInclude,

      orderBy: {
        session: {
          attendanceDate: "desc",
        },
      },
    });
  },

  classAttendance(
    schoolId: string,
    classId: string,
    sectionId: string
  ) {
    return prisma.attendance.findMany({
      where: {
        schoolId,

        session: {
          classId,
          sectionId,
        },
      },

      include: attendanceInclude,

      orderBy: {
        session: {
          attendanceDate: "desc",
        },
      },
    });
  },

  todayAttendance(
    schoolId: string,
    attendanceDate: Date
  ) {
    return prisma.attendance.findMany({
      where: {
        schoolId,

        session: {
          attendanceDate,
        },
      },

      include: attendanceInclude,
    });
  },

  getAttendanceStudents(
  schoolId: string,
  academicYearId: string,
  classId: string,
  sectionId: string
) {
  return prisma.studentEnrollment.findMany({
    where: {
      schoolId,
      academicYearId,
      classId,
      sectionId,
      active: true,
    },

    include: {
      student: {
        select: {
          id: true,
          admissionNo: true,
          fullName: true,
        },
      },
    },

    orderBy: [
      {
        rollNo: "asc",
      },
      {
        student: {
          fullName: "asc",
        },
      },
    ],
  });
},

bulkMarkAttendance(
  schoolId: string,
  input: {
    sessionId: string;
    attendance: {
      studentId: string;
      status: AttendanceStatus;
      remarks?: string;
    }[];
  }
) {
  return prisma.$transaction(async (tx) => {
    await tx.attendance.deleteMany({
      where: {
        sessionId: input.sessionId,
      },
    });

    await tx.attendance.createMany({
      data: input.attendance.map((item) => ({
        schoolId,

        sessionId: input.sessionId,

        studentId: item.studentId,

        status: item.status,

        remarks: item.remarks,
      })),
    });

    return {
      success: true,
      sessionId: input.sessionId,
    };
  });
},

getSessionStudents(
  schoolId: string,
  sessionId: string
) {
  return prisma.attendanceSession.findFirst({
    where: {
      id: sessionId,
      schoolId,
    },

    include: {
      class: true,

      section: true,

      subject: true,

      teacher: true,

      period: true,

      records: true,

      academicYear: true,
    },
  });
},

findSessionByType(
  schoolId: string,
  academicYearId: string,
  classId: string,
  sectionId: string,
  sessionType: "DAILY" | "MORNING" | "AFTERNOON",
  attendanceDate: Date
) {
  return prisma.attendanceSession.findFirst({
    where: {
      schoolId,
      academicYearId,
      classId,
      sectionId,
      sessionType,
      attendanceDate,
    },
  });
},

listSessions(
  schoolId: string,
  options?: {
    skip?: number;
    take?: number;
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
    date?: Date;
  }
) {
  return prisma.attendanceSession.findMany({
    where: {
      schoolId,

      ...(options?.academicYearId && {
        academicYearId: options.academicYearId,
      }),

      ...(options?.classId && {
        classId: options.classId,
      }),

      ...(options?.sectionId && {
        sectionId: options.sectionId,
      }),

      ...(options?.date && {
        attendanceDate: options.date,
      }),
    },

    skip: options?.skip,
    take: options?.take,

    include: {
      academicYear: true,
      class: true,
      section: true,
      teacher: true,
      subject: true,
      period: true,

      records: {
        select: {
          status: true,
        },
      },
    },

    orderBy: [
      {
        attendanceDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
},

countSessions(
  schoolId: string,
  options?: {
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
    date?: Date;
  }
) {
  return prisma.attendanceSession.count({
    where: {
      schoolId,

      ...(options?.academicYearId && {
        academicYearId: options.academicYearId,
      }),

      ...(options?.classId && {
        classId: options.classId,
      }),

      ...(options?.sectionId && {
        sectionId: options.sectionId,
      }),

      ...(options?.date && {
        attendanceDate: options.date,
      }),
    },
  });
},

studentAttendanceReport(
  schoolId: string,
  studentId: string,
  academicYearId: string,
  fromDate?: Date,
  toDate?: Date
) {
  return prisma.attendance.findMany({
    where: {
      schoolId,
      studentId,

      session: {
        academicYearId,

        ...(fromDate || toDate
          ? {
              attendanceDate: {
                ...(fromDate && {
                  gte: fromDate,
                }),

                ...(toDate && {
                  lte: toDate,
                }),
              },
            }
          : {}),
      },
    },

    include: {
      session: {
        include: {
          academicYear: true,
          class: true,
          section: true,
          teacher: true,
          subject: true,
          period: true,
        },
      },
    },

    orderBy: {
      session: {
        attendanceDate: "desc",
      },
    },
  });
},

async classAttendanceReport(
  schoolId: string,
  academicYearId: string,
  classId: string,
  sectionId: string,
  fromDate?: Date,
  toDate?: Date
) {
  const enrollments =
    await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        academicYearId,
        classId,
        sectionId,
        active: true,
      },

      select: {
        studentId: true,
        rollNo: true,

        student: {
          select: {
            id: true,
            admissionNo: true,
            fullName: true,
          },
        },
      },

      orderBy: [
        {
          rollNo: "asc",
        },
        {
          student: {
            fullName: "asc",
          },
        },
      ],
    });

  const studentIds =
    enrollments.map(
      (item) => item.studentId
    );

  if (studentIds.length === 0) {
    return {
      enrollments,
      records: [],
    };
  }

  const records =
    await prisma.attendance.findMany({
      where: {
        schoolId,
        studentId: {
          in: studentIds,
        },

        session: {
          academicYearId,
          classId,
          sectionId,

          ...(fromDate || toDate
            ? {
                attendanceDate: {
                  ...(fromDate && {
                    gte: fromDate,
                  }),

                  ...(toDate && {
                    lte: toDate,
                  }),
                },
              }
            : {}),
        },
      },

      select: {
        studentId: true,
        status: true,

        session: {
  select: {
    id: true,
    attendanceDate: true,
    sessionType: true,
    academicYear: {
      select: {
        id: true,
        attendanceMode: true,
      },
    },
  },
},
      },

      orderBy: {
        session: {
          attendanceDate: "desc",
        },
      },
    });

  return {
    enrollments,
    records,
  };
},

lowAttendanceReport(
  schoolId: string,
  academicYearId: string,
  classId?: string,
  sectionId?: string,
) {
  return prisma.studentEnrollment.findMany({
    where: {
      schoolId,
      academicYearId,
      active: true,

      ...(classId && {
        classId,
      }),

      ...(sectionId && {
        sectionId,
      }),
    },

    select: {
      studentId: true,
      rollNo: true,

      student: {
        select: {
          id: true,
          admissionNo: true,
          fullName: true,
        },
      },
    },

    orderBy: [
      {
        rollNo: "asc",
      },
      {
        student: {
          fullName: "asc",
        },
      },
    ],
  });
},

lowAttendanceRecords(
  schoolId: string,
  academicYearId: string,
  studentIds: string[],
  fromDate?: Date,
  toDate?: Date
) {
  if (studentIds.length === 0) {
    return Promise.resolve([]);
  }

  return prisma.attendance.findMany({
    where: {
      schoolId,

      studentId: {
        in: studentIds,
      },

      session: {
        academicYearId,

        ...(fromDate || toDate
          ? {
              attendanceDate: {
                ...(fromDate && {
                  gte: fromDate,
                }),

                ...(toDate && {
                  lte: toDate,
                }),
              },
            }
          : {}),
      },
    },

    select: {
      studentId: true,

      status: true,

      session: {
        select: {
          id: true,
          attendanceDate: true,
          sessionType: true,
          periodId: true,
        },
      },
    },

    orderBy: {
      session: {
        attendanceDate: "desc",
      },
    },
  });
},

updateAttendance(
  sessionId: string,
  studentId: string,
  schoolId: string,
  data: Prisma.AttendanceUpdateInput
) {
  return prisma.attendance.upsert({
    where: {
      sessionId_studentId: {
        sessionId,
        studentId,
      },
    },

    update: data,

    create: {
      school: {
        connect: {
          id: schoolId,
        },
      },

      session: {
        connect: {
          id: sessionId,
        },
      },

      student: {
        connect: {
          id: studentId,
        },
      },

      status: data.status as Prisma.AttendanceCreateInput["status"],

      remarks:
        typeof data.remarks === "string"
          ? data.remarks
          : null,
    },
  });
},

findSessionForCorrection(
  sessionId: string,
  schoolId: string
) {
  return prisma.attendanceSession.findFirst({
    where: {
      id: sessionId,
      schoolId,
    },

    select: {
      id: true,
      schoolId: true,
      locked: true,
    },
  });
},

bulkUpdateAttendance(
  sessionId: string,
  schoolId: string,
  changes: {
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }[],
) {
  return prisma.$transaction(
    async (tx) => {
      const results = [];

      for (const change of changes) {
        const record =
          await tx.attendance.upsert({
            where: {
              sessionId_studentId: {
                sessionId,
                studentId:
                  change.studentId,
              },
            },

            update: {
              status: change.status,
              remarks:
                change.remarks ?? null,
            },

            create: {
              school: {
                connect: {
                  id: schoolId,
                },
              },

              session: {
                connect: {
                  id: sessionId,
                },
              },

              student: {
                connect: {
                  id: change.studentId,
                },
              },

              status: change.status,

              remarks:
                change.remarks ?? null,
            },
          });

        results.push(record);
      }

      return results;
    },
  );
},

lockSession(
  sessionId: string,
  schoolId: string,
) {
  return prisma.attendanceSession.updateMany({
    where: {
      id: sessionId,
      schoolId,
      locked: false,
    },

    data: {
      locked: true,
    },
  });
},

lockAllSessions(
  schoolId: string,
  academicYearId: string,
  attendanceDate: Date,
) {
  return prisma.attendanceSession.updateMany({
    where: {
      schoolId,
      academicYearId,
      attendanceDate,
      locked: false,
    },
    data: {
      locked: true,
    },
  });
},

async getSessionsForLocking(
  schoolId: string,
  academicYearId: string,
  attendanceDate: Date,
) {
  const sessions =
    await prisma.attendanceSession.findMany({
      where: {
        schoolId,
        academicYearId,
        attendanceDate,
      },

      select: {
        id: true,
        classId: true,
        sectionId: true,
        periodId: true,
        sessionType: true,
        locked: true,

        _count: {
          select: {
            records: true,
          },
        },
      },

      orderBy: [
        {
          classId: "asc",
        },
        {
          sectionId: "asc",
        },
        {
          periodId: "asc",
        },
      ],
    });

  return sessions;
},

async getEnrollmentCountsForLocking(
  schoolId: string,
  academicYearId: string,
  classSectionPairs: {
    classId: string;
    sectionId: string;
  }[],
) {
  if (classSectionPairs.length === 0) {
    return [];
  }

  return prisma.studentEnrollment.groupBy({
    by: ["classId", "sectionId"],

    where: {
      schoolId,
      academicYearId,
      active: true,

      OR: classSectionPairs.map(
        ({ classId, sectionId }) => ({
          classId,
          sectionId,
        }),
      ),
    },

    _count: {
      studentId: true,
    },
  });
},

dashboardData(
  schoolId: string,
  academicYearId: string,
) {
  return Promise.all([
    prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        academicYearId,
        active: true,
      },

      select: {
        studentId: true,
      },
    }),

    prisma.attendanceSession.findMany({
      where: {
        schoolId,
        academicYearId,
      },

      orderBy: {
        attendanceDate: "desc",
      },

      take: 8,

      

      select: {
        id: true,
        attendanceDate: true,
        sessionType: true,
        locked: true,

        class: {
          select: {
            name: true,
          },
        },

        section: {
          select: {
            name: true,
          },
        },

        records: {
          select: {
            status: true,
          },
        },
      },
    }),

    prisma.attendance.findMany({
      where: {
        schoolId,

        session: {
          academicYearId,
        },
      },

      select: {
        studentId: true,
        status: true,

        session: {
          select: {
            attendanceDate: true,
            sessionType: true,
            periodId: true,
          },
        },
      },
    }),
  ]);
},

todayAttendanceSessions(
  schoolId: string,
  academicYearId: string,
  from: Date,
  to: Date,
) {
  return prisma.attendanceSession.findMany({
    where: {
      schoolId,
      academicYearId,

      attendanceDate: {
        gte: from,
        lt: to,
      },
    },

    select: {
      id: true,
    },
  });
},

attendanceBySessions(
  schoolId: string,
  sessionIds: string[],
) {
  if (sessionIds.length === 0) {
    return Promise.resolve([]);
  }

  return prisma.attendance.findMany({
    where: {
      schoolId,

      sessionId: {
        in: sessionIds,
      },
    },

    select: {
      studentId: true,
      status: true,
    },
  });
},

getCurrent(schoolId: string) {
  return prisma.academicYear.findFirst({
    where: {
      schoolId,
      active: true,
    },
    orderBy: {
      startDate: "desc",
    },
  });
},

async markFullPresent(
  schoolId: string,
  academicYearId: string,
  attendanceDate: Date,
  sessionType: "DAILY" | "MORNING" | "AFTERNOON" | "PERIOD",
  filters?: {
    classId?: string;
    sectionId?: string;
  },
) {
  const enrollments =
    await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        academicYearId,
        active: true,

        ...(filters?.classId
          ? {
              classId: filters.classId,
            }
          : {}),

        ...(filters?.sectionId
          ? {
              sectionId:
                filters.sectionId,
            }
          : {}),
      },

      select: {
        id: true,
        studentId: true,
        classId: true,
        sectionId: true,
      },
    });

  if (enrollments.length === 0) {
    return {
      sessionCount: 0,
      attendanceCount: 0,
    };
  }

  const groups = new Map<
    string,
    {
      classId: string;
      sectionId: string;
    }
  >();

  for (const enrollment of enrollments) {
    const key =
      `${enrollment.classId}:${enrollment.sectionId}`;

    groups.set(key, {
      classId:
        enrollment.classId,
      sectionId:
        enrollment.sectionId,
    });
  }

  return prisma.$transaction(
    async (tx) => {
      let sessionCount = 0;
      let attendanceCount = 0;

      for (const group of groups.values()) {
        let session =
          await tx.attendanceSession.findFirst({
            where: {
              schoolId,
              academicYearId,
              classId:
                group.classId,
              sectionId:
                group.sectionId,
              sessionType,
              attendanceDate,
            },
          });

        if (!session) {
          session =
            await tx.attendanceSession.create({
              data: {
                schoolId,
                academicYearId,
                classId:
                  group.classId,
                sectionId:
                  group.sectionId,
                sessionType,
                attendanceDate,
              },
            });

          sessionCount++;
        }

        /*
         * Never modify a locked session.
         */
        if (session.locked) {
          continue;
        }

        const studentIds =
          enrollments
            .filter(
              (enrollment) =>
                enrollment.classId ===
                  group.classId &&
                enrollment.sectionId ===
                  group.sectionId,
            )
            .map(
              (enrollment) =>
                enrollment.studentId,
            );

        /*
         * Only create attendance records
         * that do not already exist.
         *
         * This is important:
         *
         * Mark Full Present must NOT erase
         * absentees that were already marked.
         */
        const existingRecords =
          await tx.attendance.findMany({
            where: {
              sessionId:
                session.id,

              studentId: {
                in: studentIds,
              },
            },

            select: {
              studentId: true,
            },
          });

        const existingStudentIds =
          new Set(
            existingRecords.map(
              (record) =>
                record.studentId,
            ),
          );

        const newStudentIds =
          studentIds.filter(
            (studentId) =>
              !existingStudentIds.has(
                studentId,
              ),
          );

        if (
          newStudentIds.length === 0
        ) {
          continue;
        }

        await tx.attendance.createMany({
          data: newStudentIds.map(
            (studentId) => ({
              schoolId,
              sessionId:
                session.id,
              studentId,
              status: "PRESENT",
            }),
          ),
        });

        attendanceCount +=
          newStudentIds.length;
      }

      return {
        sessionCount,
        attendanceCount,
      };
    },
  );
},

async markFullPresentForPeriods(
  schoolId: string,
  academicYearId: string,
  attendanceDate: Date,
  filters?: {
    classId?: string;
    sectionId?: string;
  },
) {
  /*
   * Prisma WeekDay only supports Monday-Saturday.
   */
  const weekDays = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ] as const;

  const day = weekDays[attendanceDate.getDay()];

  /*
   * Sunday is not part of the Prisma WeekDay enum.
   */
  if (day === "SUNDAY") {
    return {
      sessionCount: 0,
      attendanceCount: 0,
    };
  }

  /*
   * Find today's active timetable entries.
   *
   * Timetable
   *   -> teacherAllocation
   *      -> classId
   *      -> sectionId
   *      -> subjectId
   *      -> teacherId
   *
   * We only need timetable entries belonging
   * to the selected school/year/class/section.
   */
  const timetables =
    await prisma.timetable.findMany({
      where: {
        schoolId,
        academicYearId,
        day,
        active: true,

        teacherAllocation: {
          active: true,

          ...(filters?.classId
            ? {
                classId: filters.classId,
              }
            : {}),

          ...(filters?.sectionId
            ? {
                sectionId: filters.sectionId,
              }
            : {}),
        },
      },

      select: {
        id: true,
        periodId: true,

        teacherAllocation: {
          select: {
            classId: true,
            sectionId: true,
            subjectId: true,
            teacherId: true,
          },
        },
      },

      orderBy: {
        periodId: "asc",
      },
    });

  if (timetables.length === 0) {
    return {
      sessionCount: 0,
      attendanceCount: 0,
    };
  }

  /*
   * Find all active students for the selected scope.
   */
  const enrollments =
    await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        academicYearId,
        active: true,

        ...(filters?.classId
          ? {
              classId: filters.classId,
            }
          : {}),

        ...(filters?.sectionId
          ? {
              sectionId: filters.sectionId,
            }
          : {}),
      },

      select: {
        studentId: true,
        classId: true,
        sectionId: true,
      },
    });

  if (enrollments.length === 0) {
    return {
      sessionCount: 0,
      attendanceCount: 0,
    };
  }

  return prisma.$transaction(
    async (tx) => {
      let sessionCount = 0;
      let attendanceCount = 0;

      /*
       * Each timetable entry represents one period
       * for one class/section.
       */
      for (const timetable of timetables) {
        const {
          classId,
          sectionId,
          subjectId,
          teacherId,
        } = timetable.teacherAllocation;

        /*
         * Find the students belonging to this
         * particular class + section.
         */
        const studentIds =
          enrollments
            .filter(
              (enrollment) =>
                enrollment.classId === classId &&
                enrollment.sectionId === sectionId,
            )
            .map(
              (enrollment) =>
                enrollment.studentId,
            );

        if (studentIds.length === 0) {
          continue;
        }

        /*
         * Find existing PERIOD session.
         */
        let session =
          await tx.attendanceSession.findFirst({
            where: {
              schoolId,
              academicYearId,
              classId,
              sectionId,
              periodId: timetable.periodId,
              sessionType: "PERIOD",
              attendanceDate,
            },
          });

        /*
         * Create the period session if it doesn't
         * already exist.
         */
        if (!session) {
          session =
            await tx.attendanceSession.create({
              data: {
                schoolId,
                academicYearId,
                classId,
                sectionId,
                periodId:
                  timetable.periodId,
                subjectId,
                teacherId,
                sessionType: "PERIOD",
                attendanceDate,
              },
            });

          sessionCount++;
        }

        /*
         * Never modify a locked session.
         */
        if (session.locked) {
          continue;
        }

        /*
         * Get attendance records that already exist.
         */
        const existingRecords =
          await tx.attendance.findMany({
            where: {
              sessionId: session.id,
              studentId: {
                in: studentIds,
              },
            },

            select: {
              studentId: true,
            },
          });

        const existingStudentIds =
          new Set(
            existingRecords.map(
              (record) =>
                record.studentId,
            ),
          );

        /*
         * Only add PRESENT records for students
         * who don't already have an attendance record.
         *
         * IMPORTANT:
         *
         * If a student was already marked ABSENT,
         * LATE or LEAVE, we leave it untouched.
         */
        const newStudentIds =
          studentIds.filter(
            (studentId) =>
              !existingStudentIds.has(
                studentId,
              ),
          );

        if (newStudentIds.length === 0) {
          continue;
        }

        await tx.attendance.createMany({
          data: newStudentIds.map(
            (studentId) => ({
              schoolId,
              sessionId: session.id,
              studentId,
              status: "PRESENT",
            }),
          ),
        });

        attendanceCount +=
          newStudentIds.length;
      }

      return {
        sessionCount,
        attendanceCount,
      };
    },
  );
}
};
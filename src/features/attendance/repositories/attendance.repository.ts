import {
  Prisma,
  AttendanceStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

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
  fromDate?: Date,
  toDate?: Date
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
};
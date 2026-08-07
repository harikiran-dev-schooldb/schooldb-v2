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
}
};
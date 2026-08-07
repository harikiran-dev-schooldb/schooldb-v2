import { Prisma } from "@/generated/prisma/client";

import { timetableRepository } from "@/features/timetable/repositories/timetable.repository";

import {
  AttendanceFormOutput
} from "../schemas/attendance.schema";

import {
  AttendanceSessionFormOutput,
} from "../schemas/attendance-session.schema";

import { prisma } from "@/lib/prisma";

import { attendanceRepository } from "../repositories/attendance.repository";
import { studentEnrollmentRepository } from "@/features/student-enrollments/repositories/student-enrollment.repository";

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

    attendanceDate: new Date(
      input.attendanceDate
    ),

    remarks: input.remarks,
  });
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
}
};
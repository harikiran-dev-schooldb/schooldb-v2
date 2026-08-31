import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

import { z } from "zod";

const schema = z.object({
  academicYearId: z.string().min(1),
  attendanceDate: z.string().min(1),

  scope: z.enum([
    "SCHOOL",
    "CLASS",
    "SECTION",
  ]),

  classId: z.string().optional(),
  sectionId: z.string().optional(),

  sessionType: z.enum([
    "DAILY",
    "MORNING",
    "AFTERNOON",
    "PERIOD",
  ]),

  timetableId: z.string().optional(),
});

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant =
      await requireTenant();

    const body = schema.parse(
      await req.json(),
    );

    if (
      body.scope === "CLASS" &&
      !body.classId
    ) {
      return ApiResponse.error(
        "Class is required.",
        400,
      );
    }

    if (
      body.scope === "SECTION" &&
      (!body.classId ||
        !body.sectionId)
    ) {
      return ApiResponse.error(
        "Class and section are required.",
        400,
      );
    }

    const date =
      new Date(
        `${body.attendanceDate}T00:00:00.000Z`,
      );

    const enrollments =
      await prisma.studentEnrollment.findMany({
        where: {
          schoolId: tenant.schoolId,
          academicYearId:
            body.academicYearId,
          active: true,

          ...(body.scope === "CLASS"
            ? {
                classId: body.classId,
              }
            : {}),

          ...(body.scope === "SECTION"
            ? {
                classId: body.classId,
                sectionId:
                  body.sectionId,
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
      return ApiResponse.error(
        "No active students found for the selected scope.",
        400,
      );
    }

    /*
     * AttendanceSession is always
     * class + section based.
     *
     * Therefore school/class operations
     * are grouped into their respective
     * class-section combinations.
     */
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

    const result =
      await prisma.$transaction(
        async (tx) => {
          let sessionCount = 0;
          let attendanceCount = 0;

          for (const group of groups.values()) {
            const session =
              await tx.attendanceSession.upsert({
                where: {
                  id: "__not_used__",
                },

                create: {
                  schoolId:
                    tenant.schoolId,

                  academicYearId:
                    body.academicYearId,

                  classId:
                    group.classId,

                  sectionId:
                    group.sectionId,

                  sessionType:
                    body.sessionType,

                  periodId:
                    undefined,

                  attendanceDate:
                    date,

                  locked: false,
                },

                update: {},
              });

            sessionCount++;

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

            for (
              const studentId of studentIds
            ) {
              await tx.attendance.upsert({
                where: {
                  sessionId_studentId: {
                    sessionId:
                      session.id,
                    studentId,
                  },
                },

                create: {
                  schoolId:
                    tenant.schoolId,

                  sessionId:
                    session.id,

                  studentId,

                  status: "PRESENT",
                },

                update: {
                  status: "PRESENT",
                },
              });

              attendanceCount++;
            }
          }

          return {
            sessionCount,
            attendanceCount,
          };
        },
      );

    return ApiResponse.success(
      result,
      "Attendance marked present successfully.",
    );
  });
}
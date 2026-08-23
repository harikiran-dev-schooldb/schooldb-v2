import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: Request, { params }: Props) {
  try {
    const { id: studentId } = await params;

    const tenant = await requireTenant();

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);

    const academicYearId =
      searchParams.get("academicYearId") || undefined;

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    /* ------------------------------------------------------------------ */
    /* Student                                                            */
    /* ------------------------------------------------------------------ */

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: tenant.schoolId,
      },
      select: {
        id: true,
        admissionNo: true,
        fullName: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          message: "Student not found.",
        },
        { status: 404 },
      );
    }

    /* ------------------------------------------------------------------ */
    /* Attendance records                                                 */
    /* ------------------------------------------------------------------ */

    const attendance = await prisma.attendance.findMany({
  where: {
    schoolId: tenant.schoolId,
    studentId,

    session: {
      ...(academicYearId
        ? {
            academicYearId,
          }
        : {}),

      ...(from || to
        ? {
            attendanceDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
  },

  select: {
    id: true,
    status: true,

    session: {
      select: {
        id: true,
        attendanceDate: true,

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

        subject: {
          select: {
            name: true,
          },
        },

        period: {
          select: {
            name: true,
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

    /* ------------------------------------------------------------------ */
    /* Group attendance by actual date                                    */
    /* ------------------------------------------------------------------ */

    const byDate = new Map<
      string,
      {
        statuses: string[];
      }
    >();

    for (const record of attendance) {
      const dateKey = new Date(record.session.attendanceDate)
        .toISOString()
        .slice(0, 10);

      const existing = byDate.get(dateKey);

      if (existing) {
        existing.statuses.push(record.status);
      } else {
        byDate.set(dateKey, {
          statuses: [record.status],
        });
      }
    }

    /* ------------------------------------------------------------------ */
    /* Daily attendance calculation                                       */
    /* ------------------------------------------------------------------ */

    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;

    for (const [, day] of byDate) {
      const hasPresent = day.statuses.includes("PRESENT");
      const hasLate = day.statuses.includes("LATE");

      if (hasLate) {
        lateDays += 1;
        presentDays += 1;
      } else if (hasPresent) {
        presentDays += 1;
      } else {
        absentDays += 1;
      }
    }

    const workingDays = byDate.size;

    const percentage =
      workingDays > 0
        ? Number(((presentDays / workingDays) * 100).toFixed(2))
        : 0;

    /* ------------------------------------------------------------------ */
    /* Monthly summary                                                    */
    /* ------------------------------------------------------------------ */

    const monthlyMap = new Map<
      string,
      {
        workingDays: number;
        presentDays: number;
        absentDays: number;
        lateDays: number;
      }
    >();

    for (const [dateKey, day] of byDate) {
      const monthKey = dateKey.slice(0, 7);

      const current = monthlyMap.get(monthKey) ?? {
        workingDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
      };

      current.workingDays += 1;

      const hasPresent = day.statuses.includes("PRESENT");
      const hasLate = day.statuses.includes("LATE");

      if (hasLate) {
        current.lateDays += 1;
        current.presentDays += 1;
      } else if (hasPresent) {
        current.presentDays += 1;
      } else {
        current.absentDays += 1;
      }

      monthlyMap.set(monthKey, current);
    }

    const monthly = Array.from(monthlyMap.entries())
      .map(([month, value]) => ({
        month,

        ...value,

        percentage:
          value.workingDays > 0
            ? Number(
                (
                  (value.presentDays / value.workingDays) *
                  100
                ).toFixed(2),
              )
            : 0,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    /* ------------------------------------------------------------------ */
    /* Response                                                           */
    /* ------------------------------------------------------------------ */

    return NextResponse.json({
      success: true,

      data: {
        student,

        summary: {
          workingDays,
          presentDays,
          absentDays,
          lateDays,
          percentage,
        },

        monthly,

        records: attendance.map((item) => ({
          id: item.id,

          status: item.status,

          session: {
            attendanceDate: item.session.attendanceDate,

            class: item.session.class,

            section: item.session.section,

            subject: item.session.subject,

            period: item.session.period,
          },
        })),
      },
    });
  } catch (error) {
    console.error(
      "Failed to load student attendance:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load student attendance.",
      },
      { status: 500 },
    );
  }
}
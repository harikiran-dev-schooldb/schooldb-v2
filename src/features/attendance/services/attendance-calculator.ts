import {
  AttendanceMode,
  AttendanceSessionType,
  AttendanceStatus,
} from "@/generated/prisma/client";

type AttendanceRecord = {
  status: AttendanceStatus;

  session: {
    attendanceDate: Date | string;
    sessionType: AttendanceSessionType | null;
    periodId?: string | null;
  };
};

type AttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  attendancePercentage: number;
};

export function calculateAttendance(
  records: AttendanceRecord[],
  attendanceMode: AttendanceMode
): AttendanceSummary {
  if (records.length === 0) {
    return {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      attendancePercentage: 0,
    };
  }

  /*
   * ONCE_DAILY
   *
   * One attendance opportunity per day.
   *
   * If duplicate attendance records exist
   * for the same student on the same day,
   * use the latest record.
   */
  if (attendanceMode === "ONCE_DAILY") {
    return calculateOnceDaily(records);
  }

  /*
   * MORNING_AFTERNOON
   *
   * One opportunity for MORNING and one
   * opportunity for AFTERNOON per day.
   */
  if (
    attendanceMode ===
    "MORNING_AFTERNOON"
  ) {
    return calculateMorningAfternoon(
      records
    );
  }

  /*
   * EVERY_PERIOD
   *
   * Each period is an independent
   * attendance opportunity.
   */
  if (
    attendanceMode ===
    "EVERY_PERIOD"
  ) {
    return calculateEveryPeriod(records);
  }

  return calculateRaw(records);
}

/* ---------------------------------- */
/* ONCE DAILY                         */
/* ---------------------------------- */

function calculateOnceDaily(
  records: AttendanceRecord[]
): AttendanceSummary {
  const daily = new Map<
    string,
    AttendanceRecord
  >();

  for (const record of records) {
    const date = normalizeDate(
      record.session.attendanceDate
    );

    /*
     * If duplicate records exist for the
     * same day, the later record replaces
     * the previous one.
     */
    daily.set(date, record);
  }

  return summarize(
    Array.from(daily.values())
  );
}

/* ---------------------------------- */
/* MORNING / AFTERNOON                */
/* ---------------------------------- */

function calculateMorningAfternoon(
  records: AttendanceRecord[]
): AttendanceSummary {
  const sessions = new Map<
    string,
    AttendanceRecord
  >();

  for (const record of records) {
    const date = normalizeDate(
      record.session.attendanceDate
    );

    const type =
      record.session.sessionType;

    /*
     * DAILY/NULL records are not treated as
     * Morning or Afternoon records.
     */
    if (
      type !== "MORNING" &&
      type !== "AFTERNOON"
    ) {
      continue;
    }

    const key = `${date}:${type}`;

    sessions.set(key, record);
  }

  return summarize(
    Array.from(sessions.values())
  );
}

/* ---------------------------------- */
/* EVERY PERIOD                       */
/* ---------------------------------- */

function calculateEveryPeriod(
  records: AttendanceRecord[]
): AttendanceSummary {
  const periods = new Map<
    string,
    AttendanceRecord
  >();

  for (const record of records) {
    if (
      record.session.sessionType !== "PERIOD" ||
      !record.session.periodId
    ) {
      continue;
    }

    const date = normalizeDate(
      record.session.attendanceDate
    );

    const key =
      `${date}:PERIOD:${record.session.periodId}`;

    periods.set(key, record);
  }

  return summarize(
    Array.from(periods.values())
  );
}

/* ---------------------------------- */
/* FALLBACK                           */
/* ---------------------------------- */

function calculateRaw(
  records: AttendanceRecord[]
): AttendanceSummary {
  return summarize(records);
}

/* ---------------------------------- */
/* SUMMARY                            */
/* ---------------------------------- */

function summarize(
  records: AttendanceRecord[]
): AttendanceSummary {
  const total = records.length;

  const present = records.filter(
    (record) =>
      record.status === "PRESENT"
  ).length;

  const absent = records.filter(
    (record) =>
      record.status === "ABSENT"
  ).length;

  const late = records.filter(
    (record) =>
      record.status === "LATE"
  ).length;

  const leave = records.filter(
    (record) =>
      record.status === "LEAVE"
  ).length;

  /*
   * PRESENT + LATE are both successful
   * attendance from a percentage perspective.
   *
   * A student who is late was present.
   */
  const attended =
    present + late;

  const attendancePercentage =
    total > 0
      ? Number(
          Math.min(
            100,
            (attended / total) * 100
          ).toFixed(2)
        )
      : 0;

  return {
    total,
    present,
    absent,
    late,
    leave,
    attendancePercentage,
  };
}

/* ---------------------------------- */
/* DATE                               */
/* ---------------------------------- */

function normalizeDate(
  value: Date | string
) {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0"),
  ].join("-");
}
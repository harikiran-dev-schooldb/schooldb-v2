"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AcademicYearSelect,
  ClassSelect,
  SectionSelect,
} from "@/components/common/select";

import { Button } from "@/components/ui/button";

type AttendanceMode = "ONCE_DAILY" | "MORNING_AFTERNOON" | "EVERY_PERIOD";

type AcademicYearOption = {
  id: string;
  label: string;
  attendanceMode: AttendanceMode;
};

type TimetableOption = {
  id: string;
  periodId: string;
  periodName: string;
  day: string;
  subjectName: string;
  teacherName: string;
};

type Props = {
  schoolSlug: string;
};

function getTodayWeekDay(): string {
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];

  return days[new Date().getDay()];
}

export function AttendancePage({ schoolSlug }: Props) {
  const router = useRouter();

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [timetable, setTimetable] = useState<TimetableOption[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  useEffect(() => {
    async function loadAcademicYears() {
      try {
        const response = await fetch("/api/v1/academic-years/options");
        const result = await response.json();

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setAcademicYears(result.data);

        const activeYear = result.data[0];

        if (activeYear) {
          setAcademicYearId(activeYear.id);
        }
      } catch {
        toast.error("Failed to load academic years.");
      }
    }

    loadAcademicYears();
  }, []);

  const selectedAcademicYear = academicYears.find(
    (year) => year.id === academicYearId,
  );

  const attendanceMode = selectedAcademicYear?.attendanceMode ?? "ONCE_DAILY";

  const canLoadTimetable =
    attendanceMode === "EVERY_PERIOD" &&
    Boolean(academicYearId) &&
    Boolean(classId) &&
    Boolean(sectionId);

  function changeClass(value: string) {
    setClassId(value);
    setSectionId("");
  }

  async function createSession(
    sessionType: "DAILY" | "MORNING" | "AFTERNOON" | "PERIOD",
    timetableId?: string,
  ) {
    if (!academicYearId) {
      toast.error("Academic year is required.");
      return;
    }

    if (!classId) {
      toast.error("Class is required.");
      return;
    }

    if (!sectionId) {
      toast.error("Section is required.");
      return;
    }

    if (sessionType === "PERIOD" && !timetableId) {
      toast.error("Timetable is required.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/v1/attendance/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionType,
          timetableId,
          academicYearId,
          classId,
          sectionId,
          attendanceDate: new Date().toISOString().split("T")[0],
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      router.push(`/${schoolSlug}/attendance/session/${result.data.id}`);
    } catch {
      toast.error("Failed to create attendance session.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canLoadTimetable) return;

    let cancelled = false;

    async function loadTimetable() {
      try {
        setTimetableLoading(true);

        const day = getTodayWeekDay();

        const params = new URLSearchParams({
          academicYearId,
          classId,
          sectionId,
          day,
        });

        const response = await fetch(
          `/api/v1/attendance/timetable?${params.toString()}`,
        );

        const result = await response.json();

        if (cancelled) return;

        if (!result.success) {
          toast.error(result.message);
          setTimetable([]);
          return;
        }

        setTimetable(result.data);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load today's timetable.");
          setTimetable([]);
        }
      } finally {
        if (!cancelled) {
          setTimetableLoading(false);
        }
      }
    }

    loadTimetable();

    return () => {
      cancelled = true;
    };
  }, [canLoadTimetable, academicYearId, classId, sectionId]);

  const displayTimetable = canLoadTimetable ? timetable : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance</h1>

        <p className="text-sm text-muted-foreground">
          Select a class and take attendance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AcademicYearSelect
          value={academicYearId}
          onChange={setAcademicYearId}
          disabled={loading}
        />

        <ClassSelect value={classId} onChange={changeClass} />

        <SectionSelect
          classId={classId}
          value={sectionId}
          onChange={setSectionId}
          disabled={loading}
        />
      </div>

      {attendanceMode === "ONCE_DAILY" && (
        <Button disabled={loading} onClick={() => createSession("DAILY")}>
          {loading ? "Creating..." : "Take Daily Attendance"}
        </Button>
      )}

      {attendanceMode === "MORNING_AFTERNOON" && (
        <div className="flex gap-3">
          <Button disabled={loading} onClick={() => createSession("MORNING")}>
            Morning Attendance
          </Button>

          <Button disabled={loading} onClick={() => createSession("AFTERNOON")}>
            Afternoon Attendance
          </Button>
        </div>
      )}

      {attendanceMode === "EVERY_PERIOD" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Today&apos;s Periods</h2>

            <p className="text-sm text-muted-foreground">
              Select a period to take attendance.
            </p>
          </div>

          {canLoadTimetable && timetableLoading && (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              Loading today&apos;s timetable...
            </div>
          )}

          {canLoadTimetable &&
            !timetableLoading &&
            displayTimetable.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                No timetable periods found for today.
              </div>
            )}

          {!timetableLoading &&
            displayTimetable.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{item.periodName}</p>

                  <p className="text-sm text-muted-foreground">
                    {item.subjectName} · {item.teacherName}
                  </p>
                </div>

                <Button
                  disabled={loading}
                  onClick={() => createSession("PERIOD", item.id)}
                >
                  Take Attendance
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

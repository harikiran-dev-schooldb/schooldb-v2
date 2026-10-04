import type { Teacher } from "@/generated/prisma/client";

export const TEACHER_ACCESS_FIELDS = {
  STUDENTS: "studentDetailsAccess",
  FEES: "feeAccess",
  RESULTS: "resultAccess",
  TIMETABLE: "timetableAccess",
  ATTENDANCE: "attendanceAccess",
  HOMEWORK: "homeworkAccess",
  EXAMS: "examAccess",
  MARKS_ENTRY: "marksEntryAccess",
} as const;

export type TeacherAccessFeature = keyof typeof TEACHER_ACCESS_FIELDS;
export type TeacherAccessField = (typeof TEACHER_ACCESS_FIELDS)[TeacherAccessFeature];
export type TeacherAccessSettings = Pick<Teacher, TeacherAccessField>;

export const teacherAccessSelect = {
  studentDetailsAccess: true,
  feeAccess: true,
  resultAccess: true,
  timetableAccess: true,
  attendanceAccess: true,
  homeworkAccess: true,
  examAccess: true,
  marksEntryAccess: true,
} as const;

export function hasTeacherAccess(
  access: TeacherAccessSettings | null | undefined,
  feature: TeacherAccessFeature,
) {
  return access?.[TEACHER_ACCESS_FIELDS[feature]] === true;
}

const ROUTE_FEATURES: Array<[string, TeacherAccessFeature]> = [
  ["fees", "FEES"],
  ["attendance", "ATTENDANCE"],
  ["homework", "HOMEWORK"],
  ["exams", "EXAMS"],
  ["toppers", "RESULTS"],
  ["timetable", "TIMETABLE"],
  ["students", "STUDENTS"],
];

export function isTeacherRouteAllowed(
  access: TeacherAccessSettings | null | undefined,
  href?: string,
) {
  if (!href) return true;
  const match = ROUTE_FEATURES.find(
    ([route]) => href === route || href.startsWith(`${route}/`),
  );
  return !match || hasTeacherAccess(access, match[1]);
}

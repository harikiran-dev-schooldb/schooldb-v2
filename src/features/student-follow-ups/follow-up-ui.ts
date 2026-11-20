export type FollowUpSource = "EXAM_FAILURE" | "LOW_ATTENDANCE";
export type FollowUpStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";

export type FollowUpOrigin = {
  studentId: string;
  source: FollowUpSource;
  academicYearId?: string;
  examId?: string;
};

type Person = { id: string; fullName: string };
type Student = { id: string; fullName: string | null; admissionNo: string };
type Exam = { id: string; name: string };

export type FollowUp = {
  id: string;
  source: FollowUpSource;
  status: FollowUpStatus;
  academicYearId: string;
  nextAction: string;
  dueDate: string;
  student: Student;
  teacher: Person;
  className: string;
  sectionName: string;
  exam: Exam | null;
};

export type FollowUpList = {
  followUps: FollowUp[];
  page: number;
  hasMore: boolean;
  total: number;
  isTeacher: boolean;
  sources: FollowUpSource[];
};

export type FollowUpOptions = { student: Student; teachers: Person[]; exam: Exam | null };

export const FOLLOW_UP_SOURCES: Record<FollowUpSource, string> = {
  EXAM_FAILURE: "Exam failure",
  LOW_ATTENDANCE: "Low attendance",
};

export const FOLLOW_UP_STATUSES: Record<FollowUpStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export function isFollowUpSource(value: string | undefined): value is FollowUpSource {
  return value === "EXAM_FAILURE" || value === "LOW_ATTENDANCE";
}

export function followUpOriginParams(origin: FollowUpOrigin) {
  const params = new URLSearchParams({ studentId: origin.studentId, source: origin.source });
  if (origin.academicYearId) params.set("academicYearId", origin.academicYearId);
  if (origin.examId) params.set("examId", origin.examId);
  return params;
}

const dueDateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" });

export function formatFollowUpDate(value: string) {
  return dueDateFormat.format(new Date(`${value}T00:00:00Z`));
}

export function followUpStudentName(student: Student) {
  return student.fullName?.trim() || `Student ${student.admissionNo}`;
}

export async function fetchFollowUpData<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Unable to complete the follow-up request.");
  }
  return result.data as T;
}


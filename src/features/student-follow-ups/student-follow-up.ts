import { z } from "zod";

import { SCHOOL_TIME_ZONE } from "../../lib/date-time.ts";

export const FOLLOW_UP_SOURCES = ["EXAM_FAILURE", "LOW_ATTENDANCE"] as const;
export const FOLLOW_UP_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED"] as const;

export type FollowUpSource = (typeof FOLLOW_UP_SOURCES)[number];

const identifier = z.string().trim().min(1).max(128);
const nextAction = z.string().trim().min(3, "Enter the next action.").max(500);
const dueDate = z.iso.date({ error: "Enter a valid due date." });

export const followUpContextSchema = z.object({
  studentId: identifier,
  source: z.enum(FOLLOW_UP_SOURCES),
  academicYearId: identifier.optional(),
  examId: identifier.optional(),
});

export const createFollowUpSchema = followUpContextSchema.extend({
  teacherId: identifier,
  nextAction,
  dueDate,
});

export const updateFollowUpSchema = z.strictObject({
  status: z.enum(FOLLOW_UP_STATUSES).optional(),
  nextAction: nextAction.optional(),
  dueDate: dueDate.optional(),
  teacherId: identifier.optional(),
}).refine((value) => Object.keys(value).length > 0, "Enter a change to save.");

export const listFollowUpsSchema = z.object({
  status: z.enum(FOLLOW_UP_STATUSES).optional(),
  scope: z.literal("week").optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
});

export function followUpDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

const schoolCalendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function schoolWeek(now = new Date()) {
  const parts = schoolCalendar.formatToParts(now);
  const value = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value;
  const monday = followUpDate(`${value("year")}-${value("month")}-${value("day")}`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  return { gte: monday, lt: nextMonday };
}

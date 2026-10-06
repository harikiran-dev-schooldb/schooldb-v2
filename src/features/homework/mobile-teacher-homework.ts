import { z } from "zod";

export const publishHomeworkSchema = z.object({
  allocationId: z.string().min(1, "Class and subject are required."),
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z.string().trim().max(2000).optional().default(""),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid due date."),
});

export function schoolDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

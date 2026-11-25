import { z } from "zod";
import { validCalendarDate } from "./age-policy";
import { reviewStages, followUpOutcomes } from "./intake-policy";
const id = z.string().cuid();
const text = z.string().trim().max(1000);
const date = z.string().refine(validCalendarDate, "Enter a valid date.");
const timestamp = z.string().datetime({ offset: true });
export const enquirySchema = z.object({
  academicYearId: id, classId: id, studentName: z.string().trim().min(2).max(255),
  parentName: z.string().trim().min(2).max(255),
  mobile: z.string().trim().regex(/^\d{10}$/),
  dob: date.nullable(), source: z.enum(["WALK_IN","PHONE","REFERRAL","OTHER"]), notes: text,
}).strict();
export const enquiryActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CLOSE") }).strict(),
  z.object({ action: z.enum(["ACCEPT","DISMISS","REOPEN"]) }).strict(),
  z.object({ action: z.literal("LINK"), applicationNo: z.string().trim().min(6).max(50) }).strict(),
]);
export const stageSchema = z.object({
  stage: z.enum(["ENTRANCE","INTERVIEW"]), status: z.enum(reviewStages),
  scheduledAt: timestamp.nullable(), assignedMemberId: id.nullable(),
}).strict().superRefine((value, context) => {
  if (value.status === "SCHEDULED" && (!value.scheduledAt || !value.assignedMemberId)) {
    context.addIssue({ code: "custom", message: "A scheduled stage needs a date and active staff member." });
  }
});
export const taskSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CREATE"), target: z.enum(["ENQUIRY","APPLICATION"]), targetId: id, assignedMemberId: id, dueAt: timestamp, note: z.string().trim().min(1).max(1000) }).strict(),
  z.object({ action: z.literal("COMPLETE"), taskId: id, outcome: z.enum(followUpOutcomes), completionNote: text }).strict(),
]);

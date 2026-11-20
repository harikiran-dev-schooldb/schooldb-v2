import type {
  StrategicWorkflowPriority,
  StrategicWorkflowStatus,
  StrategicWorkflowType,
} from "@/generated/prisma/client";

export const WORKFLOW_TYPES: Array<{
  value: StrategicWorkflowType;
  label: string;
  description: string;
}> = [
  { value: "LESSON_PLAN", label: "Lesson plan", description: "Plan teaching objectives, resources and syllabus progress." },
  { value: "ASSIGNMENT_SUBMISSION", label: "Assignment review", description: "Track submissions, reviews, rubrics and resubmissions." },
  { value: "PARENT_TEACHER_MEETING", label: "Parent-teacher meeting", description: "Schedule a meeting and retain agreed actions." },
  { value: "STUDENT_WELLBEING", label: "Wellbeing case", description: "Protect confidential behaviour, counselling and safeguarding work." },
  { value: "TRANSPORT_SAFETY", label: "Transport safety", description: "Track trips, delays, boarding concerns and safety incidents." },
  { value: "PROCUREMENT", label: "Procurement", description: "Move a purchase request through review and completion." },
  { value: "TIMETABLE_SUBSTITUTION", label: "Substitution", description: "Assign and confirm timetable substitutions." },
  { value: "EARLY_WARNING", label: "Early warning", description: "Coordinate support for attendance or academic risk." },
];

export const WORKFLOW_STATUSES: StrategicWorkflowStatus[] = [
  "DRAFT",
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
  "CANCELLED",
];

export const WORKFLOW_PRIORITIES: StrategicWorkflowPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
];

export function workflowLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

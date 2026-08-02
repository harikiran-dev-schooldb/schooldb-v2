// src/features/students/constants/student-status.ts

import { StudentStatus } from "@/generated/prisma/browser";

export const STUDENT_STATUS_OPTIONS = [
  { value: StudentStatus.ACTIVE, label: "Active" },
  { value: StudentStatus.INACTIVE, label: "Inactive" },
  { value: StudentStatus.TC_ISSUED, label: "Transferred" },
  { value: StudentStatus.DROPPED, label: "Dropped" },
  { value: StudentStatus.ALUMNI, label: "Alumni" },
];
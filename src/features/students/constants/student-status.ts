export enum StudentStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  TC_ISSUED = "TC_ISSUED",
  DROPPED = "DROPPED",
  ALUMNI = "ALUMNI",
}

export const STUDENT_STATUS_OPTIONS = [
  { value: StudentStatus.ACTIVE, label: "Active" },
  { value: StudentStatus.INACTIVE, label: "Inactive" },
  { value: StudentStatus.TC_ISSUED, label: "TC" },
  { value: StudentStatus.DROPPED, label: "Dropped" },
  { value: StudentStatus.ALUMNI, label: "Alumni" },
];
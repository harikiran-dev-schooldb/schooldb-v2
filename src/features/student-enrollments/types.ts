export type StudentEnrollmentListItem = {
  id: string;

  studentId: string;

  studentName: string;

  admissionNo: string;

  academicYearId: string;
  academicYearName: string;

  classId: string;
  className: string;

  sectionId: string;
  sectionName: string;

  rollNo: number | null;

  admissionDate: Date | null;

  active: boolean;

  nextAcademicYearName: string | null;
  nextClassName: string | null;
  nextSectionName: string | null;
  nextEnrollmentStatus:
    | "READY"
    | "ENROLLED"
    | "GRADUATING"
    | "NEEDS_SECTION"
    | "NEXT_YEAR_MISSING";
};

export type EnrollmentPlanningSummary = {
  currentAcademicYearName: string | null;
  nextAcademicYearName: string | null;
  currentStudents: number;
};

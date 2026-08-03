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
};
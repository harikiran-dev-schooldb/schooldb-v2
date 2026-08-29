export type ClassSubjectRow = {
  id: string;
  academicYearId: string;
  academicYearName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  subjectType: string;
  active: boolean;
};

export type BulkClassSubjectRow = {
  academicYear: string;
  className: string;
  subject: string;
  active?: boolean;
};
export type TeacherAllocationListItem = {
  id: string;

  academicYearId: string;
  academicYearName: string;

  teacherId: string;
  teacherName: string;

  subjectId: string;
  subjectName: string;

  classId: string;
  className: string;

  sectionId: string;
  sectionName: string;

  remarks: string | null;

  active: boolean;
};

export type TeacherAllocationOption = {
  id: string;
  label: string;
};
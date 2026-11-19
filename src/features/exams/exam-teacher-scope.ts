export type ExamTeacherAssignment = {
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId?: string;
};

export function getExamTeacherAssignments(
  assignments: readonly ExamTeacherAssignment[],
  academicYearId: string,
  classId: string,
  sectionId?: string | null,
) {
  return assignments.filter(
    (assignment) =>
      assignment.academicYearId === academicYearId &&
      assignment.classId === classId &&
      (!sectionId || assignment.sectionId === sectionId),
  );
}

export function assignedExamScheduleFilter(assignment: ExamTeacherAssignment) {
  return {
    classId: assignment.classId,
    OR: [{ sectionId: assignment.sectionId }, { sectionId: null }],
    ...(assignment.subjectId ? { subjectId: assignment.subjectId } : {}),
  };
}

export function canViewExamSchedule(
  assignments: readonly ExamTeacherAssignment[],
  enrollmentSectionId: string,
  subjectId: string,
) {
  return assignments.some(
    (assignment) =>
      assignment.sectionId === enrollmentSectionId &&
      (!assignment.subjectId || assignment.subjectId === subjectId),
  );
}

export type AudienceType =
  | "SCHOOL"
  | "SYLLABUS"
  | "BRANCH"
  | "CLASS"
  | "SECTION"
  | "STUDENT";

export type StudentAudienceScope = {
  id: string;
  enrollments: Array<{
    classId: string;
    sectionId: string;
    class: { branchId: string; branch: { syllabusId: string } };
  }>;
};

export function audienceVisibility(students: StudentAudienceScope[]) {
  return [
    { targetType: "SCHOOL", targetId: null },
    { targetType: "STUDENT", targetId: { in: students.map((student) => student.id) } },
    {
      targetType: "SYLLABUS",
      targetId: {
        in: students.flatMap((student) =>
          student.enrollments.map((enrollment) => enrollment.class.branch.syllabusId),
        ),
      },
    },
    {
      targetType: "BRANCH",
      targetId: {
        in: students.flatMap((student) =>
          student.enrollments.map((enrollment) => enrollment.class.branchId),
        ),
      },
    },
    {
      targetType: "CLASS",
      targetId: {
        in: students.flatMap((student) =>
          student.enrollments.map((enrollment) => enrollment.classId),
        ),
      },
    },
    {
      targetType: "SECTION",
      targetId: {
        in: students.flatMap((student) =>
          student.enrollments.map((enrollment) => enrollment.sectionId),
        ),
      },
    },
  ];
}

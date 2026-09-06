export type AudienceType = "SCHOOL" | "CLASS" | "SECTION" | "STUDENT";

export type StudentAudienceScope = {
  id: string;
  enrollments: Array<{ classId: string; sectionId: string }>;
};

export function audienceVisibility(students: StudentAudienceScope[]) {
  return [
    { targetType: "SCHOOL", targetId: null },
    { targetType: "STUDENT", targetId: { in: students.map((student) => student.id) } },
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

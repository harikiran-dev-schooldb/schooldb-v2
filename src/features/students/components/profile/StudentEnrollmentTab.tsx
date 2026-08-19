"use client";

type Enrollment = {
  id: string;
  rollNo: string | null;

  academicYear: {
    id: string;
    name: string;
  };

  class: {
    id: string;
    name: string;
  };

  section: {
    id: string;
    name: string;
  };
};

type Student = {
  enrollments: Enrollment[];
};

type Props = {
  student: Student;
};

export function StudentEnrollmentTab({ student }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border p-6">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b text-left">
            <th className="p-3">Academic Year</th>
            <th className="p-3">Class</th>
            <th className="p-3">Section</th>
            <th className="p-3">Roll No</th>
          </tr>
        </thead>

        <tbody>
          {student.enrollments.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="p-6 text-center text-sm text-muted-foreground"
              >
                No enrollment records found.
              </td>
            </tr>
          ) : (
            student.enrollments.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="p-3">{item.academicYear.name}</td>

                <td className="p-3">{item.class.name}</td>

                <td className="p-3">{item.section.name}</td>

                <td className="p-3">{item.rollNo ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

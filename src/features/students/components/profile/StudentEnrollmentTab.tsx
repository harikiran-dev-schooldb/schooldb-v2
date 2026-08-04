"use client";

type Props = {
  student: any;
};

export function StudentEnrollmentTab({ student }: Props) {
  return (
    <div className="rounded-lg border p-6">
      <table className="w-full">
        <thead>
          <tr>
            <th>Academic Year</th>
            <th>Class</th>
            <th>Section</th>
            <th>Roll No</th>
          </tr>
        </thead>

        <tbody>
          {student.enrollments.map((item: any) => (
            <tr key={item.id}>
              <td>{item.academicYear.name}</td>

              <td>{item.class.name}</td>

              <td>{item.section.name}</td>

              <td>{item.rollNo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

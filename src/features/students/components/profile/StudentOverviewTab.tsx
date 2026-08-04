"use client";

type Props = {
  student: any;
};

export function StudentOverviewTab({ student }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border p-6">
      <div>
        Admission No
        <br />
        <b>{student.admissionNo}</b>
      </div>

      <div>
        Student Name
        <br />
        <b>{student.fullName}</b>
      </div>

      <div>
        Gender
        <br />
        <b>{student.gender}</b>
      </div>

      <div>
        DOB
        <br />
        <b>{student.dob.substring(0, 10)}</b>
      </div>

      <div>
        Phone
        <br />
        <b>{student.phone}</b>
      </div>

      <div>
        Email
        <br />
        <b>{student.email}</b>
      </div>
    </div>
  );
}

"use client";

type Student = {
  admissionNo: string;
  fullName: string;
  gender: string;
  dob: string | null;
  phone: string | null;
  email: string | null;
};

type Props = {
  student: Student;
};

export function StudentOverviewTab({ student }: Props) {
  const dob = student.dob ? student.dob.substring(0, 10) : "—";

  return (
    <div className="grid gap-4 rounded-lg border p-6 sm:grid-cols-2">
      <div>
        <p className="text-sm text-muted-foreground">Admission No</p>
        <p className="font-semibold">{student.admissionNo}</p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Student Name</p>
        <p className="font-semibold">{student.fullName}</p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Gender</p>
        <p className="font-semibold">{student.gender}</p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Date of Birth</p>
        <p className="font-semibold">{dob}</p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Phone</p>
        <p className="font-semibold">{student.phone ?? "—"}</p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Email</p>
        <p className="font-semibold">{student.email ?? "—"}</p>
      </div>
    </div>
  );
}

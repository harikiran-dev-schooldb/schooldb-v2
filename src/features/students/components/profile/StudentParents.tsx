"use client";

import {
  BriefcaseBusiness,
  GraduationCap,
  Heart,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Student = {
  fatherName: string | null;
  fatherPhone: string | null;
  fatherEmail: string | null;
  fatherOccupation: string | null;
  fatherQualification: string | null;
  fatherIncome: string | number | null;
  fatherAadhar: string | null;

  motherName: string | null;
  motherPhone: string | null;
  motherEmail: string | null;
  motherOccupation: string | null;
  motherQualification: string | null;
  motherIncome: string | number | null;
  motherAadhar: string | null;

  guardianName: string | null;
  guardianRelation: string | null;
  guardianPhone: string | null;
};

type Props = {
  student: Student;
};

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function maskAadhar(value: string | null) {
  if (!value) return "—";

  const cleaned = value.replace(/\s/g, "");

  if (cleaned.length <= 4) {
    return cleaned;
  }

  return `XXXX XXXX ${cleaned.slice(-4)}`;
}

function ParentCard({
  title,
  name,
  phone,
  email,
  occupation,
  qualification,
  income,
  aadhar,
  icon: Icon,
}: {
  title: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  qualification: string | null;
  income: string | number | null;
  aadhar: string | null;
  icon: typeof UserRound;
}) {
  const hasDetails =
    !!name ||
    !!phone ||
    !!email ||
    !!occupation ||
    !!qualification ||
    !!income ||
    !!aadhar;

  return (
    <Card className="overflow-hidden rounded-2xl border shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>

            <div>
              <CardTitle className="text-base">{title}</CardTitle>

              <p className="text-xs text-muted-foreground">
                Parent information
              </p>
            </div>
          </div>

          <Badge variant="outline">
            {hasDetails ? "Available" : "Not provided"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {!hasDetails ? (
          <div className="flex min-h-32 items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              No information has been provided.
            </p>
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {/* Name */}

            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">Name</p>

              <p className="mt-1 text-base font-semibold">{display(name)}</p>
            </div>

            {/* Phone */}

            <div>
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-muted-foreground" />

                <p className="text-xs font-medium text-muted-foreground">
                  Phone
                </p>
              </div>

              <p className="mt-1 font-medium">{display(phone)}</p>
            </div>

            {/* Email */}

            <div>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-muted-foreground" />

                <p className="text-xs font-medium text-muted-foreground">
                  Email
                </p>
              </div>

              <p className="mt-1 break-all font-medium">{display(email)}</p>
            </div>

            {/* Occupation */}

            <div>
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="size-3.5 text-muted-foreground" />

                <p className="text-xs font-medium text-muted-foreground">
                  Occupation
                </p>
              </div>

              <p className="mt-1 font-medium">{display(occupation)}</p>
            </div>

            {/* Qualification */}

            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="size-3.5 text-muted-foreground" />

                <p className="text-xs font-medium text-muted-foreground">
                  Qualification
                </p>
              </div>

              <p className="mt-1 font-medium">{display(qualification)}</p>
            </div>

            {/* Income */}

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Annual Income
              </p>

              <p className="mt-1 font-medium">
                {income !== null && income !== undefined && income !== ""
                  ? `₹${Number(income).toLocaleString("en-IN")}`
                  : "—"}
              </p>
            </div>

            {/* Aadhar */}

            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-muted-foreground" />

                <p className="text-xs font-medium text-muted-foreground">
                  Aadhaar
                </p>
              </div>

              <p className="mt-1 font-medium tracking-wide">
                {maskAadhar(aadhar)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StudentParentsTab({ student }: Props) {
  const hasGuardian = Boolean(
    student.guardianName || student.guardianRelation || student.guardianPhone,
  );

  return (
    <div className="space-y-5">
      {/* Page header */}

      <Card className="overflow-hidden rounded-2xl border shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Heart className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold">Parents & Guardian</h2>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Parent, guardian and emergency contact information associated
                with this student.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Father / Mother */}

      <div className="grid gap-5 xl:grid-cols-2">
        <ParentCard
          title="Father"
          name={student.fatherName}
          phone={student.fatherPhone}
          email={student.fatherEmail}
          occupation={student.fatherOccupation}
          qualification={student.fatherQualification}
          income={student.fatherIncome}
          aadhar={student.fatherAadhar}
          icon={UserRound}
        />

        <ParentCard
          title="Mother"
          name={student.motherName}
          phone={student.motherPhone}
          email={student.motherEmail}
          occupation={student.motherOccupation}
          qualification={student.motherQualification}
          income={student.motherIncome}
          aadhar={student.motherAadhar}
          icon={UserRound}
        />
      </div>

      {/* Guardian */}

      <Card className="overflow-hidden rounded-2xl border shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>

            <div>
              <CardTitle className="text-base">Guardian</CardTitle>

              <p className="text-xs text-muted-foreground">
                Alternate guardian information
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {!hasGuardian ? (
            <div className="flex min-h-24 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No guardian information has been provided.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Guardian Name
                </p>

                <p className="mt-1 font-semibold">
                  {display(student.guardianName)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Relationship
                </p>

                <p className="mt-1 font-semibold">
                  {display(student.guardianRelation)}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground" />

                  <p className="text-xs font-medium text-muted-foreground">
                    Phone
                  </p>
                </div>

                <p className="mt-1 font-semibold">
                  {display(student.guardianPhone)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

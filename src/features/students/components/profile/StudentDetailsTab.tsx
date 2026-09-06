"use client";

import type { ReactNode } from "react";
import {
  Activity,
  HeartPulse,
  Home,
  IdCard,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { StudentProfileData } from "./StudentProfile";

type Props = {
  student: StudentProfileData;
};

function display(value: ReactNode) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatEnum(value: string | null) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function maskAadhaar(value: string | null) {
  if (!value) return "—";
  const cleaned = value.replace(/\s/g, "");
  return cleaned.length <= 4 ? cleaned : `XXXX XXXX ${cleaned.slice(-4)}`;
}

function formatIncome(value: string | number | null) {
  if (value === null || value === "") return "—";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-background p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold text-foreground">
        {display(value)}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof IdCard;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
        {children}
      </CardContent>
    </Card>
  );
}

export function StudentDetailsTab({ student }: Props) {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-2xl border shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-semibold">Complete Student Record</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every saved profile field is grouped below for quick review.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {formatEnum(student.status)}
          </Badge>
        </CardContent>
      </Card>

      <DetailSection
        title="Identity & account"
        description="Admission, personal and login information."
        icon={IdCard}
      >
        <DetailItem label="Admission Number" value={student.admissionNo} />
        <DetailItem label="Student Name" value={student.fullName} />
        <DetailItem label="Gender" value={formatEnum(student.gender)} />
        <DetailItem label="Date of Birth" value={formatDate(student.dob)} />
        <DetailItem label="Joined Date" value={formatDate(student.joinedDate)} />
        <DetailItem label="Status" value={formatEnum(student.status)} />
        <DetailItem
          label="Username"
          value={student.username || `STD_${student.admissionNo}`}
        />
        <DetailItem label="Profile Image URL" value={student.imageUrl} />
      </DetailSection>

      <DetailSection
        title="Government & demographic details"
        description="Official identifiers and demographic information."
        icon={ShieldCheck}
      >
        <DetailItem label="Student Aadhaar" value={maskAadhaar(student.studentAadhar)} />
        <DetailItem label="APAAR ID" value={student.apaarId} />
        <DetailItem label="PEN Number" value={student.penNo} />
        <DetailItem label="EMIS Number" value={student.emisNo} />
        <DetailItem label="Blood Group" value={student.bloodGroup} />
        <DetailItem label="Nationality" value={student.nationality} />
        <DetailItem label="Mother Tongue" value={student.motherTongue} />
        <DetailItem label="Religion" value={formatEnum(student.religion)} />
        <DetailItem label="Category" value={formatEnum(student.category)} />
        <DetailItem label="Caste" value={student.caste} />
        <DetailItem label="Sub-caste" value={student.subCaste} />
      </DetailSection>

      <DetailSection
        title="Contact & address"
        description="Communication and residential information."
        icon={Home}
      >
        <DetailItem label="Primary Phone" value={student.phone} />
        <DetailItem label="Alternate Phone" value={student.alternatePhone} />
        <DetailItem label="Student Email" value={student.email} />
        <DetailItem label="Address" value={student.address} />
        <DetailItem label="City" value={student.city} />
        <DetailItem label="District" value={student.district} />
        <DetailItem label="State" value={student.state} />
        <DetailItem label="PIN Code" value={student.pincode} />
        <DetailItem label="Country" value={student.country} />
      </DetailSection>

      <DetailSection
        title="Parents & guardian"
        description="Family identity, contact and occupation details."
        icon={UsersRound}
      >
        <DetailItem label="Father's Name" value={student.fatherName} />
        <DetailItem label="Father's Phone" value={student.fatherPhone} />
        <DetailItem label="Father's Email" value={student.fatherEmail} />
        <DetailItem label="Father's Aadhaar" value={maskAadhaar(student.fatherAadhar)} />
        <DetailItem label="Father's Occupation" value={student.fatherOccupation} />
        <DetailItem label="Father's Qualification" value={student.fatherQualification} />
        <DetailItem label="Father's Annual Income" value={formatIncome(student.fatherIncome)} />
        <DetailItem label="Mother's Name" value={student.motherName} />
        <DetailItem label="Mother's Phone" value={student.motherPhone} />
        <DetailItem label="Mother's Email" value={student.motherEmail} />
        <DetailItem label="Mother's Aadhaar" value={maskAadhaar(student.motherAadhar)} />
        <DetailItem label="Mother's Occupation" value={student.motherOccupation} />
        <DetailItem label="Mother's Qualification" value={student.motherQualification} />
        <DetailItem label="Mother's Annual Income" value={formatIncome(student.motherIncome)} />
        <DetailItem label="Guardian Name" value={student.guardianName} />
        <DetailItem label="Guardian Phone" value={student.guardianPhone} />
        <DetailItem label="Guardian Relationship" value={student.guardianRelation} />
      </DetailSection>

      <DetailSection
        title="Health & services"
        description="Medical contacts, health notes and school services."
        icon={HeartPulse}
      >
        <DetailItem label="Doctor Name" value={student.doctorName} />
        <DetailItem label="Doctor Phone" value={student.doctorPhone} />
        <DetailItem label="Medical Conditions" value={student.medicalConditions} />
        <DetailItem label="Allergies" value={student.allergies} />
        <DetailItem label="Transport Required" value={student.transportRequired ? "Yes" : "No"} />
        <DetailItem label="Hostel Required" value={student.hostelRequired ? "Yes" : "No"} />
        <DetailItem label="Remarks" value={student.remarks} />
      </DetailSection>

      <DetailSection
        title="Record history"
        description="Status notes and database audit information."
        icon={Activity}
      >
        <DetailItem label="Record ID" value={student.id} />
        <DetailItem label="Created" value={formatDateTime(student.createdAt)} />
        <DetailItem label="Last Updated" value={formatDateTime(student.updatedAt)} />
        <DetailItem label="Status Changed" value={formatDateTime(student.statusChangedAt)} />
        <DetailItem label="Status Remarks" value={student.statusRemarks} />
      </DetailSection>
    </div>
  );
}

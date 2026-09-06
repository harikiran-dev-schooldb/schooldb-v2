"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { FormField, SubmitButton } from "@/components/common/forms";
import { GenderSelect } from "@/components/common/select/GenderSelect";
import { StudentStatusSelect } from "@/components/common/select/StudentStatusSelect";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { refreshTable } from "@/lib/table-event";

import {
  createStudentSchema,
  StudentFormInput,
  StudentFormOutput,
} from "../schemas/student.schema";

type Props = {
  mode: "create" | "edit";
  studentId?: string;
  onSuccess: () => void;
};

type TextField = {
  name: keyof StudentFormInput;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "url";
};

const defaultValues: StudentFormInput = {
  admissionNo: "",
  fullName: "",
  gender: "MALE",
  dob: "",
  joinedDate: "",
  phone: "",
  alternatePhone: "",
  email: "",
  imageUrl: "",
  status: "ACTIVE",
  studentAadhar: "",
  apaarId: "",
  penNo: "",
  emisNo: "",
  bloodGroup: "",
  nationality: "",
  motherTongue: "",
  religion: null,
  category: null,
  caste: "",
  subCaste: "",
  address: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  country: "",
  fatherName: "",
  fatherPhone: "",
  fatherEmail: "",
  fatherAadhar: "",
  fatherOccupation: "",
  fatherQualification: "",
  fatherIncome: "",
  motherName: "",
  motherPhone: "",
  motherEmail: "",
  motherAadhar: "",
  motherOccupation: "",
  motherQualification: "",
  motherIncome: "",
  guardianName: "",
  guardianPhone: "",
  guardianRelation: "",
  doctorName: "",
  doctorPhone: "",
  medicalConditions: "",
  allergies: "",
  hostelRequired: false,
  transportRequired: false,
  remarks: "",
};

const identityFields: TextField[] = [
  { name: "joinedDate", label: "Joined Date", type: "date" },
  { name: "imageUrl", label: "Profile Image URL (optional)", placeholder: "https://...", type: "url" },
];

const identifierFields: TextField[] = [
  { name: "studentAadhar", label: "Student Aadhaar (optional)", placeholder: "Aadhaar number" },
  { name: "apaarId", label: "APAAR ID (optional)", placeholder: "APAAR ID" },
  { name: "penNo", label: "PEN Number", placeholder: "Permanent Education Number" },
  { name: "emisNo", label: "EMIS Number (optional)", placeholder: "EMIS number" },
  { name: "bloodGroup", label: "Blood Group", placeholder: "e.g. O+" },
  { name: "nationality", label: "Nationality", placeholder: "Nationality" },
  { name: "motherTongue", label: "Mother Tongue", placeholder: "Mother tongue" },
  { name: "caste", label: "Caste", placeholder: "Caste" },
  { name: "subCaste", label: "Sub-caste", placeholder: "Sub-caste" },
];

const contactFields: TextField[] = [
  { name: "phone", label: "Primary Phone", placeholder: "Mobile number", type: "tel" },
  { name: "alternatePhone", label: "Alternate Phone", placeholder: "Alternate number", type: "tel" },
  { name: "email", label: "Student Email", placeholder: "student@example.com", type: "email" },
  { name: "city", label: "City", placeholder: "City" },
  { name: "district", label: "District", placeholder: "District" },
  { name: "state", label: "State", placeholder: "State" },
  { name: "pincode", label: "PIN Code", placeholder: "PIN code" },
  { name: "country", label: "Country", placeholder: "Country" },
];

const fatherFields: TextField[] = [
  { name: "fatherName", label: "Father's Name", placeholder: "Full name" },
  { name: "fatherPhone", label: "Father's Phone", placeholder: "Mobile number", type: "tel" },
  { name: "fatherEmail", label: "Father's Email", placeholder: "Email address", type: "email" },
  { name: "fatherAadhar", label: "Father's Aadhaar (optional)", placeholder: "Aadhaar number" },
  { name: "fatherOccupation", label: "Father's Occupation", placeholder: "Occupation" },
  { name: "fatherQualification", label: "Father's Qualification", placeholder: "Qualification" },
  { name: "fatherIncome", label: "Father's Annual Income", placeholder: "Annual income", type: "number" },
];

const motherFields: TextField[] = [
  { name: "motherName", label: "Mother's Name", placeholder: "Full name" },
  { name: "motherPhone", label: "Mother's Phone", placeholder: "Mobile number", type: "tel" },
  { name: "motherEmail", label: "Mother's Email", placeholder: "Email address", type: "email" },
  { name: "motherAadhar", label: "Mother's Aadhaar (optional)", placeholder: "Aadhaar number" },
  { name: "motherOccupation", label: "Mother's Occupation", placeholder: "Occupation" },
  { name: "motherQualification", label: "Mother's Qualification", placeholder: "Qualification" },
  { name: "motherIncome", label: "Mother's Annual Income", placeholder: "Annual income", type: "number" },
];

const guardianFields: TextField[] = [
  { name: "guardianName", label: "Guardian Name", placeholder: "Full name" },
  { name: "guardianPhone", label: "Guardian Phone", placeholder: "Mobile number", type: "tel" },
  { name: "guardianRelation", label: "Relationship", placeholder: "Relationship to student" },
];

const medicalFields: TextField[] = [
  { name: "doctorName", label: "Doctor Name", placeholder: "Doctor's name" },
  { name: "doctorPhone", label: "Doctor Phone", placeholder: "Doctor's phone", type: "tel" },
];

const religionOptions = [
  ["HINDU", "Hindu"],
  ["MUSLIM", "Muslim"],
  ["CHRISTIAN", "Christian"],
  ["SIKH", "Sikh"],
  ["BUDDHIST", "Buddhist"],
  ["JAIN", "Jain"],
  ["OTHER", "Other"],
] as const;

const categoryOptions = [
  ["GENERAL", "General"],
  ["OBC", "OBC"],
  ["BC_A", "BC-A"],
  ["BC_B", "BC-B"],
  ["BC_C", "BC-C"],
  ["BC_D", "BC-D"],
  ["BC_E", "BC-E"],
  ["SC", "SC"],
  ["ST", "ST"],
  ["EWS", "EWS"],
  ["RTE", "RTE"],
] as const;

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6">
      <div className="mb-6">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export function StudentForm({ mode, studentId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(
    mode === "edit" && Boolean(studentId),
  );

  const form = useForm<StudentFormInput, unknown, StudentFormOutput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues,
  });

  const gender = useWatch({ control: form.control, name: "gender" });
  const status = useWatch({ control: form.control, name: "status" });
  const admissionNo = useWatch({ control: form.control, name: "admissionNo" });

  function errorFor(name: keyof StudentFormInput) {
    return form.formState.errors[name]?.message as string | undefined;
  }

  function renderFields(fields: TextField[]) {
    return fields.map((field) => (
      <FormField key={field.name} label={field.label} error={errorFor(field.name)}>
        <Input
          type={field.type ?? "text"}
          min={field.type === "number" ? 0 : undefined}
          step={field.type === "number" ? "0.01" : undefined}
          placeholder={field.placeholder}
          className="h-11 bg-background"
          {...form.register(field.name)}
        />
      </FormField>
    ));
  }

  useEffect(() => {
    if (mode !== "edit" || !studentId) {
      return;
    }

    let cancelled = false;

    async function loadStudent() {
      try {
        const res = await fetch(`/api/v1/students/${studentId}`, {
          cache: "no-store",
        });
        const result = await res.json();

        if (cancelled) return;
        if (!result.success) {
          toast.error(result.message || "Failed to load student.");
          return;
        }

        const student = result.data;
        form.reset({
          ...defaultValues,
          ...student,
          dob: student.dob ? student.dob.substring(0, 10) : "",
          joinedDate: student.joinedDate
            ? student.joinedDate.substring(0, 10)
            : "",
          fatherIncome: student.fatherIncome?.toString() ?? "",
          motherIncome: student.motherIncome?.toString() ?? "",
          religion: student.religion ?? null,
          category: student.category ?? null,
          hostelRequired: Boolean(student.hostelRequired),
          transportRequired: Boolean(student.transportRequired),
        });
      } catch {
        if (!cancelled) toast.error("Failed to load student.");
      } finally {
        if (!cancelled) setLoadingStudent(false);
      }
    }

    void loadStudent();
    return () => {
      cancelled = true;
    };
  }, [mode, studentId, form]);

  async function onSubmit(values: StudentFormOutput) {
    try {
      setLoading(true);
      const payload = createStudentSchema.parse(values);
      const isCreate = mode === "create";
      const res = await fetch(
        isCreate ? "/api/v1/students" : `/api/v1/students/${studentId}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await res.json();

      if (!result.success) {
        toast.error(result.message || "Failed to save student.");
        return;
      }

      toast.success(
        result.message ||
          (isCreate
            ? "Student created successfully."
            : "Student updated successfully."),
      );
      refreshTable("students");
      if (isCreate) form.reset(defaultValues);
      onSuccess();
    } catch {
      toast.error("Please review the form and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingStudent) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        Loading student details…
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <FormSection
        title="Student identity"
        description="Core identity, admission and account information."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Admission No" required error={errorFor("admissionNo")}>
            <Input className="h-11 bg-background" placeholder="e.g. ADM-2026-001" {...form.register("admissionNo")} />
          </FormField>
          <FormField label="Student Name" error={errorFor("fullName")}>
            <Input className="h-11 bg-background" placeholder="Enter full name" {...form.register("fullName")} />
          </FormField>
          <FormField label="Gender" required error={errorFor("gender")}>
            <GenderSelect
              value={gender}
              onChange={(value) => form.setValue("gender", value, { shouldDirty: true, shouldValidate: true })}
            />
          </FormField>
          <FormField label="Date of Birth" required error={errorFor("dob")}>
            <Input type="date" className="h-11 bg-background" {...form.register("dob")} />
          </FormField>
          {renderFields(identityFields.slice(0, 1))}
          <FormField label="Student Status" required error={errorFor("status")}>
            <StudentStatusSelect
              value={status}
              onChange={(value) => form.setValue("status", value, { shouldDirty: true, shouldValidate: true })}
            />
          </FormField>
          <FormField
            label="Username (automatic)"
            description="Generated from the admission number and cannot be changed manually."
          >
            <Input
              readOnly
              value={admissionNo.trim() ? `STD_${admissionNo.trim()}` : "STD_ADMISSION_NO"}
              className="h-11 bg-muted font-medium"
              aria-readonly="true"
            />
          </FormField>
          {renderFields(identityFields.slice(1))}
        </div>
      </FormSection>

      <FormSection
        title="Government & demographic details"
        description="Official identifiers and demographic information used by the school."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {renderFields(identifierFields.slice(0, 7))}
          <Controller
            control={form.control}
            name="religion"
            render={({ field }) => (
              <FormField label="Religion" error={errorFor("religion")}>
                <Select value={field.value ?? "UNSPECIFIED"} onValueChange={(value) => field.onChange(value === "UNSPECIFIED" ? null : value)}>
                  <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSPECIFIED">Not specified</SelectItem>
                    {religionOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormField label="Category" error={errorFor("category")}>
                <Select value={field.value ?? "UNSPECIFIED"} onValueChange={(value) => field.onChange(value === "UNSPECIFIED" ? null : value)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNSPECIFIED">Not specified</SelectItem>
                    {categoryOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />
          {renderFields(identifierFields.slice(7))}
        </div>
      </FormSection>

      <FormSection
        title="Contact & address"
        description="Student communication details and permanent address."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {renderFields(contactFields.slice(0, 3))}
          <FormField label="Address" error={errorFor("address")} className="md:col-span-2">
            <Textarea placeholder="Full residential address" {...form.register("address")} />
          </FormField>
          {renderFields(contactFields.slice(3))}
        </div>
      </FormSection>

      <FormSection title="Father's details" description="Father's contact, identity and occupational information.">
        <div className="grid gap-5 md:grid-cols-2">{renderFields(fatherFields)}</div>
      </FormSection>

      <FormSection title="Mother's details" description="Mother's contact, identity and occupational information.">
        <div className="grid gap-5 md:grid-cols-2">{renderFields(motherFields)}</div>
      </FormSection>

      <FormSection title="Guardian details (optional)" description="This entire section can be left blank when a separate guardian is not required.">
        <div className="grid gap-5 md:grid-cols-2">{renderFields(guardianFields)}</div>
      </FormSection>

      <FormSection title="Health & school services (optional)" description="This entire section can be left blank when there are no medical or service requirements.">
        <div className="grid gap-5 md:grid-cols-2">
          {renderFields(medicalFields)}
          <FormField label="Medical Conditions" error={errorFor("medicalConditions")}>
            <Textarea placeholder="Known medical conditions" {...form.register("medicalConditions")} />
          </FormField>
          <FormField label="Allergies" error={errorFor("allergies")}>
            <Textarea placeholder="Known allergies" {...form.register("allergies")} />
          </FormField>
          <Controller
            control={form.control}
            name="transportRequired"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-4">
                <div><p className="text-sm font-semibold">Transport required</p><p className="mt-1 text-xs text-muted-foreground">Student needs school transport.</p></div>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Transport required" />
              </div>
            )}
          />
          <Controller
            control={form.control}
            name="hostelRequired"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-4">
                <div><p className="text-sm font-semibold">Hostel required</p><p className="mt-1 text-xs text-muted-foreground">Student needs hostel accommodation.</p></div>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Hostel required" />
              </div>
            )}
          />
          <FormField label="Remarks (optional)" error={errorFor("remarks")} className="md:col-span-2">
            <Textarea placeholder="Additional notes about the student" {...form.register("remarks")} />
          </FormField>
        </div>
      </FormSection>

      <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-border/60 bg-card/95 px-6 py-4 backdrop-blur-xl sm:-mx-8 sm:-mb-8 sm:px-8">
        <SubmitButton
          loading={loading}
          mode={mode}
          createLabel="Create Student"
          updateLabel="Save All Changes"
          className="h-11 w-full rounded-xl font-semibold shadow-lg shadow-primary/15"
        />
      </div>
    </form>
  );
}

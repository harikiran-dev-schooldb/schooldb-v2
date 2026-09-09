"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AdmissionDocumentUpload } from "./AdmissionDocumentUpload";

type SchoolOption = {
  id: string;
  name: string;
  academicYears: { id: string; name: string }[];
  classes: {
    id: string;
    name: string;
    sections: { id: string; name: string }[];
  }[];
};

export function PublicAdmissionForm({
  schoolSlug,
  school,
}: {
  schoolSlug: string;
  school: SchoolOption;
}) {
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [gender, setGender] = useState("MALE");
  const [transportRequired, setTransportRequired] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [applicationNo, setApplicationNo] = useState("");
  const [submissionMobile, setSubmissionMobile] = useState("");
  const sections = useMemo(
    () => school.classes.find((item) => item.id === classId)?.sections ?? [],
    [classId, school.classes],
  );
  const academicYear = school.academicYears[0];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form);
    try {
      const response = await fetch(`/api/v1/public/admissions/${schoolSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          academicYearId: academicYear?.id,
          applyingClassId: classId,
          preferredSectionId: sectionId,
          gender,
          transportRequired,
          whatsappOptIn,
        }),
      });
      const result = await response.json();
      if (!result.success)
        throw new Error(result.message || "Unable to submit the application.");
      setSubmissionMobile(
        String(
          body.fatherPhone || body.motherPhone || body.guardianPhone,
        ).replace(/\D/g, ""),
      );
      setApplicationNo(result.data.applicationNo);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit the application.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (applicationNo) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
        <h2 className="mt-5 text-2xl font-black text-slate-950">
          Application submitted
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Save this application number for future communication.
        </p>
        <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-xl font-black tracking-wider text-emerald-700">
          {applicationNo}
        </div>
        <p className="mt-5 text-xs text-slate-500">
          The school will contact you on the registered parent or guardian
          mobile number.
        </p>
        <AdmissionDocumentUpload
          schoolSlug={schoolSlug}
          applicationNo={applicationNo}
          mobile={submissionMobile}
        />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <FormSection
        title="Applying for"
        description={`Admissions for ${academicYear?.name ?? "the active academic year"}`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Class" required>
            <Select
              value={classId}
              onValueChange={(value) => {
                setClassId(value);
                setSectionId("");
              }}
              required
            >
              <SelectTrigger className="h-12 bg-white">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {school.classes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Preferred section (optional)">
            <Select
              value={sectionId}
              onValueChange={setSectionId}
              disabled={!classId}
            >
              <SelectTrigger className="h-12 bg-white">
                <SelectValue placeholder="School may assign later" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FormSection>
      <FormSection
        title="Student details"
        description="Enter details exactly as shown on official records."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student full name" required>
            <Input name="studentName" required className="h-12 bg-white" />
          </Field>
          <Field label="Date of birth" required>
            <Input name="dob" type="date" required className="h-12 bg-white" />
          </Field>
          <Field label="Gender" required>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="h-12 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Previous school (optional)">
            <Input name="previousSchool" className="h-12 bg-white" />
          </Field>
          <Field label="Aadhaar number (optional)">
            <Input
              name="studentAadhar"
              inputMode="numeric"
              maxLength={12}
              className="h-12 bg-white"
            />
          </Field>
          <Field label="APAAR ID (optional)">
            <Input name="apaarId" className="h-12 bg-white" />
          </Field>
        </div>
      </FormSection>
      <FormSection
        title="Parent & guardian"
        description="At least one parent or guardian name and 10-digit mobile number is required."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Father name">
            <Input name="fatherName" className="h-12 bg-white" />
          </Field>
          <Field label="Father mobile">
            <Input
              name="fatherPhone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className="h-12 bg-white"
            />
          </Field>
          <Field label="Mother name">
            <Input name="motherName" className="h-12 bg-white" />
          </Field>
          <Field label="Mother mobile">
            <Input
              name="motherPhone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className="h-12 bg-white"
            />
          </Field>
          <Field label="Guardian name">
            <Input name="guardianName" className="h-12 bg-white" />
          </Field>
          <Field label="Guardian mobile">
            <Input
              name="guardianPhone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className="h-12 bg-white"
            />
          </Field>
          <Field label="Guardian relationship">
            <Input name="guardianRelation" className="h-12 bg-white" />
          </Field>
          <Field label="Email (optional)">
            <Input name="email" type="email" className="h-12 bg-white" />
          </Field>
        </div>
      </FormSection>
      <FormSection
        title="Address & services"
        description="These details help the school prepare the admission record."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address">
            <Textarea name="address" className="min-h-24 bg-white" />
          </Field>
          <Field label="Medical conditions (optional)">
            <Textarea name="medicalConditions" className="min-h-24 bg-white" />
          </Field>
          <Field label="City">
            <Input name="city" className="h-12 bg-white" />
          </Field>
          <Field label="District">
            <Input name="district" className="h-12 bg-white" />
          </Field>
          <Field label="State">
            <Input name="state" className="h-12 bg-white" />
          </Field>
          <Field label="PIN code">
            <Input
              name="pincode"
              inputMode="numeric"
              maxLength={6}
              className="h-12 bg-white"
            />
          </Field>
        </div>
        <label className="mt-5 flex items-center gap-3 rounded-xl border bg-white p-4 text-sm font-medium">
          <Checkbox
            checked={transportRequired}
            onCheckedChange={(value) => setTransportRequired(value === true)}
          />
          Transport service required
        </label>
      </FormSection>
      <input
        name="website"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />
      <label className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm leading-6 text-slate-600">
        <Checkbox
          checked={whatsappOptIn}
          onCheckedChange={(value) => setWhatsappOptIn(value === true)}
        />
        <span>
          I agree that the school may contact me on WhatsApp regarding this
          application and admission updates.
        </span>
      </label>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={submitting || !academicYear || !classId || !whatsappOptIn}
        className="h-12 w-full rounded-xl bg-indigo-600 text-base font-bold hover:bg-indigo-700"
      >
        {submitting ? (
          <>
            <LoaderCircle className="animate-spin" />
            Submitting application…
          </>
        ) : (
          <>
            Submit application <ChevronRight />
          </>
        )}
      </Button>
      <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="size-4 text-emerald-600" />
        Your information is securely shared only with {school.name}.
      </p>
    </form>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}

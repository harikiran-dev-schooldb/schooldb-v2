"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, ShieldCheck, UserRound } from "lucide-react";

import { teacherSchema, TeacherFormInput } from "../schemas/teacher.schema";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { GenderSelect } from "@/components/common/select/GenderSelect";
import { FormField, SubmitButton } from "@/components/common/forms";
import { refreshTable } from "@/lib/table-event";
import { ManagedProfileImageUploader } from "@/features/settings/ManagedProfileImageUploader";
import { canManageRosterProfileImages } from "@/features/settings/profile-image-policy";
import { useSchool } from "@/contexts/school-context";

type Props = {
  mode: "create" | "edit";
  teacherId?: string;
  onSuccess: () => void;
};

const defaultValues: TeacherFormInput = {
  employeeId: "",
  fullName: "",
  gender: "MALE",
  dob: "",
  joiningDate: "",
  phone: "",
  email: "",
  qualification: "",
  designation: "",
  active: true,
  studentDetailsAccess: true,
  feeAccess: true,
  resultAccess: true,
  timetableAccess: true,
  attendanceAccess: true,
  homeworkAccess: true,
  examAccess: true,
  marksEntryAccess: true,
};

const accessOptions: Array<{
  name:
    | "studentDetailsAccess"
    | "feeAccess"
    | "resultAccess"
    | "timetableAccess"
    | "attendanceAccess"
    | "homeworkAccess"
    | "examAccess"
    | "marksEntryAccess";
  label: string;
  description: string;
}> = [
  { name: "studentDetailsAccess", label: "Student details", description: "View students from assigned subjects or class-teacher sections." },
  { name: "feeAccess", label: "Student fees", description: "View fee status for students in assigned sections." },
  { name: "resultAccess", label: "Results", description: "View results belonging to assigned students and subjects." },
  { name: "timetableAccess", label: "Timetable", description: "View assigned teacher and class timetables." },
  { name: "attendanceAccess", label: "Attendance", description: "View or record attendance within assigned sections." },
  { name: "homeworkAccess", label: "Homework", description: "View and manage homework for assigned teaching allocations." },
  { name: "examAccess", label: "Exams", description: "View exams and schedules related to assigned classes or subjects." },
  { name: "marksEntryAccess", label: "Marks entry", description: "Enter marks only for allocated subjects; class teachers can cover their class." },
];

const accessFieldNames = [
  "studentDetailsAccess",
  "feeAccess",
  "resultAccess",
  "timetableAccess",
  "attendanceAccess",
  "homeworkAccess",
  "examAccess",
  "marksEntryAccess",
] as const;

export function TeacherForm({ mode, teacherId, onSuccess }: Props) {
  const { role } = useSchool();
  const canManageProfileImages = canManageRosterProfileImages(role);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const form = useForm<TeacherFormInput>({
    resolver: zodResolver(teacherSchema),
    defaultValues,
  });

  const gender = useWatch({
    control: form.control,
    name: "gender",
  });
  const fullName = useWatch({ control: form.control, name: "fullName" });
  const accessValues = useWatch({
    control: form.control,
    name: accessFieldNames,
  });

  useEffect(() => {
    if (mode !== "edit" || !teacherId) return;

    let cancelled = false;

    async function loadTeacher() {
      try {
        const res = await fetch(`/api/v1/teachers/${teacherId}`, {
          cache: "no-store",
        });

        const result = await res.json();

        if (cancelled) return;

        if (!result.success) {
          toast.error(result.message ?? "Failed to load teacher.");
          return;
        }

        const teacher = result.data;
        setImageUrl(teacher.imageUrl ?? null);

        form.reset({
          employeeId: teacher.employeeId ?? "",
          fullName: teacher.fullName ?? "",
          gender: teacher.gender ?? "MALE",
          dob: teacher.dob ? teacher.dob.substring(0, 10) : "",
          joiningDate: teacher.joiningDate
            ? teacher.joiningDate.substring(0, 10)
            : "",
          phone: teacher.phone ?? "",
          email: teacher.email ?? "",
          qualification: teacher.qualification ?? "",
          designation: teacher.designation ?? "",
          active: teacher.active ?? true,
          studentDetailsAccess: teacher.studentDetailsAccess ?? true,
          feeAccess: teacher.feeAccess ?? true,
          resultAccess: teacher.resultAccess ?? true,
          timetableAccess: teacher.timetableAccess ?? true,
          attendanceAccess: teacher.attendanceAccess ?? true,
          homeworkAccess: teacher.homeworkAccess ?? true,
          examAccess: teacher.examAccess ?? true,
          marksEntryAccess: teacher.marksEntryAccess ?? true,
        });
      } catch {
        if (!cancelled) {
          toast.error("Failed to load teacher.");
        }
      }
    }

    void loadTeacher();

    return () => {
      cancelled = true;
    };
  }, [mode, teacherId, form]);

  async function onSubmit(values: TeacherFormInput) {
    try {
      setLoading(true);

      const payload = teacherSchema.parse(values);
      const isCreate = mode === "create";

      const url = isCreate
        ? "/api/v1/teachers"
        : `/api/v1/teachers/${teacherId}`;

      const method = isCreate ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(
          result.message ||
            (isCreate
              ? "Failed to create teacher."
              : "Failed to update teacher."),
        );
        return;
      }

      toast.success(
        result.message ||
          (isCreate
            ? "Teacher created successfully."
            : "Teacher updated successfully."),
      );

      refreshTable("teachers");

      if (isCreate) {
        form.reset(defaultValues);
      }

      onSuccess();
    } catch {
      toast.error("Something went wrong while saving the teacher.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal information */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <UserRound className="size-4 text-primary" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-foreground">
              Personal Information
            </h3>
            <p className="text-xs text-muted-foreground">
              Basic teacher identification and contact details
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Employee ID"
            required
            error={form.formState.errors.employeeId?.message}
          >
            <Input
              placeholder="e.g. EMP-001"
              {...form.register("employeeId")}
            />
          </FormField>

          <FormField
            label="Teacher Name"
            required
            error={form.formState.errors.fullName?.message}
          >
            <Input placeholder="Full name" {...form.register("fullName")} />
          </FormField>

          <FormField
            label="Gender"
            required
            error={form.formState.errors.gender?.message}
          >
            <GenderSelect
              value={gender}
              onChange={(value) =>
                form.setValue("gender", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </FormField>

          <FormField
            label="Date of Birth"
            error={form.formState.errors.dob?.message}
          >
            <Input type="date" {...form.register("dob")} />
          </FormField>

          <FormField label="Phone" error={form.formState.errors.phone?.message}>
            <Input placeholder="Phone number" {...form.register("phone")} />
          </FormField>

          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input
              type="email"
              placeholder="teacher@example.com"
              {...form.register("email")}
            />
          </FormField>
          {canManageProfileImages ? (
            <div className="md:col-span-2">
              {mode === "edit" && teacherId ? (
                <ManagedProfileImageUploader
                  targetType="TEACHER"
                  targetId={teacherId}
                  name={fullName || "Teacher"}
                  imageUrl={imageUrl}
                  onImageChange={setImageUrl}
                />
              ) : (
                <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Save the teacher first, then open Edit to upload a profile image.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Professional information */}
      <div className="border-t border-border pt-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10">
            <GraduationCap className="size-4 text-teal-600" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-foreground">
              Professional Information
            </h3>
            <p className="text-xs text-muted-foreground">
              Employment and academic details
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Joining Date"
            error={form.formState.errors.joiningDate?.message}
          >
            <Input type="date" {...form.register("joiningDate")} />
          </FormField>

          <FormField
            label="Designation"
            error={form.formState.errors.designation?.message}
          >
            <Input
              placeholder="e.g. Mathematics Teacher"
              {...form.register("designation")}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Qualification"
              error={form.formState.errors.qualification?.message}
            >
              <Input
                placeholder="e.g. B.Sc, B.Ed"
                {...form.register("qualification")}
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10">
            <ShieldCheck className="size-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Teacher login access</h3>
            <p className="text-xs text-muted-foreground">
              Access is always limited to subject allocations and class-teacher assignments.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {accessOptions.map((option, index) => {
            const enabled = accessValues[index];
            return (
              <div key={option.name} className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4">
                <div>
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    form.setValue(option.name, checked, { shouldDirty: true });
                    if (option.name === "examAccess" && !checked) {
                      form.setValue("marksEntryAccess", false, { shouldDirty: true });
                    }
                    if (option.name === "marksEntryAccess" && checked) {
                      form.setValue("examAccess", true, { shouldDirty: true });
                    }
                  }}
                  aria-label={`Allow ${option.label}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <div className="border-t border-border pt-5">
        <SubmitButton
          loading={loading}
          mode={mode}
          createLabel="Create Teacher"
          updateLabel="Update Teacher"
          className="w-full"
        />
      </div>
    </form>
  );
}

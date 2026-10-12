"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  studentEnrollmentSchema,
  StudentEnrollmentFormInput,
  StudentEnrollmentFormOutput,
} from "../schemas/student-enrollment.schema";

import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";

import {
  FormField,
  NumberInput,
  SubmitButton,
} from "@/components/common/forms";

import { refreshTable } from "@/lib/table-event";

type Props = {
  mode: "create" | "edit";
  enrollmentId?: string;
  onSuccess: () => void;
};

type FeePlanPreview = {
  id: string;
  name: string;
  amount: number;
};

type ClassChangePreview = {
  fromClass: { id: string; name: string };
  toClass: { id: string; name: string };
  deactivatePlans: FeePlanPreview[];
  retainPlans: FeePlanPreview[];
  assignPlans: FeePlanPreview[];
  blockers: {
    successfulPayments: number;
    pendingCashfreeOrders: number;
    pendingDirectUpiSubmissions: number;
    messages: string[];
  };
  canChange: boolean;
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

const defaultValues: StudentEnrollmentFormInput = {
  studentId: "",
  academicYearId: "",
  classId: "",
  sectionId: "",
  rollNo: undefined,
  admissionDate: "",
  active: true,
};

export function StudentEnrollmentForm({
  mode,
  enrollmentId,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [studentLabel, setStudentLabel] = useState("");
  const [academicYearLabel, setAcademicYearLabel] = useState("");
  const [originalClassId, setOriginalClassId] = useState("");
  const [classChangePreview, setClassChangePreview] =
    useState<ClassChangePreview | null>(null);
  const [pendingUpdate, setPendingUpdate] =
    useState<StudentEnrollmentFormOutput | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const form = useForm<StudentEnrollmentFormInput>({
    resolver: zodResolver(studentEnrollmentSchema),
    defaultValues,
  });

  const studentId = useWatch({
    control: form.control,
    name: "studentId",
  });

  const academicYearId = useWatch({
    control: form.control,
    name: "academicYearId",
  });

  const classId = useWatch({
    control: form.control,
    name: "classId",
  });

  const sectionId = useWatch({
    control: form.control,
    name: "sectionId",
  });

  useEffect(() => {
    if (mode !== "edit" || !enrollmentId) {
      return;
    }

    async function loadEnrollment() {
      try {
        const res = await fetch(`/api/v1/student-enrollments/${enrollmentId}`);

        const result = await res.json();

        if (!res.ok || !result.success) {
          toast.error(result.message || "Failed to load enrollment.");

          return;
        }

        const item = result.data;

        setStudentLabel(
          item.student?.fullName
            ? `${item.student.admissionNo} — ${item.student.fullName}`
            : (item.student?.admissionNo ?? ""),
        );

        setAcademicYearLabel(item.academicYear?.name ?? "");
        setOriginalClassId(item.classId);

        form.reset({
          studentId: item.studentId,
          academicYearId: item.academicYearId,
          classId: item.classId,
          sectionId: item.sectionId,
          rollNo: item.rollNo ?? undefined,
          admissionDate: item.admissionDate
            ? item.admissionDate.substring(0, 10)
            : "",
          active: item.active,
        });
      } catch {
        toast.error("Failed to load enrollment.");
      }
    }

    void loadEnrollment();
  }, [mode, enrollmentId, form]);

  function handleStudentChange(value: string) {
    form.setValue("studentId", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleAcademicYearChange(value: string) {
    form.setValue("academicYearId", value, {
      shouldDirty: true,
      shouldValidate: true,
    });

    form.setValue("studentId", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
  }

  function handleClassChange(value: string) {
    form.setValue("classId", value, {
      shouldDirty: true,
      shouldValidate: true,
    });

    form.setValue("sectionId", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
  }

  function handleSectionChange(value: string) {
    form.setValue("sectionId", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function saveEnrollment(payload: StudentEnrollmentFormOutput) {
    try {
      setLoading(true);

      const url =
        mode === "create"
          ? "/api/v1/student-enrollments"
          : `/api/v1/student-enrollments/${enrollmentId}`;

      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.message || "Failed to save enrollment.");

        return;
      }

      toast.success(
        mode === "create"
          ? "Student enrolled successfully."
          : "Enrollment updated successfully.",
      );

      form.reset(defaultValues);

      refreshTable("enrollments");

      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save enrollment.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(values: StudentEnrollmentFormInput) {
    const payload = studentEnrollmentSchema.parse(values);
    const classChanged =
      mode === "edit" &&
      Boolean(enrollmentId) &&
      Boolean(originalClassId) &&
      payload.classId !== originalClassId;

    if (!classChanged || !enrollmentId) {
      await saveEnrollment(payload);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/v1/student-enrollments/${enrollmentId}?targetClassId=${encodeURIComponent(payload.classId)}`,
        { cache: "no-store" },
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to review the class change.");
        return;
      }

      setPendingUpdate(payload);
      setClassChangePreview(result.data);
      setConfirmationOpen(true);
    } catch {
      toast.error("Unable to review the class change.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmClassChange() {
    if (!pendingUpdate || !classChangePreview?.canChange) return;

    setConfirmationOpen(false);
    await saveEnrollment(pendingUpdate);
  }

  return (
    <>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-4 md:grid-cols-2"
      >
      {/* Academic Year */}
      <FormField
        label="Academic Year"
        required
        error={form.formState.errors.academicYearId?.message}
      >
        {mode === "edit" ? (
          <div className="flex h-10 w-full items-center rounded-xl border border-border bg-muted/40 px-3 text-sm">
            {academicYearLabel || "Loading..."}
          </div>
        ) : (
          <RemoteCombobox
            url="/api/v1/academic-years/options"
            value={academicYearId ?? ""}
            placeholder="Select Academic Year"
            onChange={handleAcademicYearChange}
          />
        )}
      </FormField>

      {/* Student */}
      <FormField
        label="Student"
        required
        error={form.formState.errors.studentId?.message}
      >
        {mode === "edit" ? (
          <div className="flex h-10 w-full items-center rounded-xl border border-border bg-muted/40 px-3 text-sm">
            {studentLabel || "Loading..."}
          </div>
        ) : academicYearId ? (
          <RemoteCombobox
            url={`/api/v1/students/options?academicYearId=${encodeURIComponent(
              academicYearId,
            )}`}
            value={studentId ?? ""}
            placeholder="Select Student"
            onChange={handleStudentChange}
          />
        ) : (
          <div className="flex h-10 w-full items-center rounded-xl border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
            Select an academic year first
          </div>
        )}
      </FormField>

      {/* Class */}
      <FormField
        label="Class"
        required
        error={form.formState.errors.classId?.message}
      >
        <RemoteCombobox
          url="/api/v1/classes/options"
          value={classId ?? ""}
          placeholder="Select Class"
          onChange={handleClassChange}
        />
      </FormField>

      {/* Section */}
      <FormField
        label="Section"
        required
        error={form.formState.errors.sectionId?.message}
      >
        {classId ? (
          <RemoteCombobox
            url={`/api/v1/sections/options?classId=${encodeURIComponent(
              classId,
            )}`}
            value={sectionId ?? ""}
            placeholder="Select Section"
            onChange={handleSectionChange}
          />
        ) : (
          <div className="flex h-10 w-full items-center rounded-xl border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
            Select a class first
          </div>
        )}
      </FormField>

      {/* Roll No */}
      <FormField label="Roll No" error={form.formState.errors.rollNo?.message}>
        <NumberInput
          placeholder="Roll No"
          {...form.register("rollNo", {
            valueAsNumber: true,
          })}
        />
      </FormField>

      {/* Admission Date */}
      <FormField
        label="Admission Date"
        error={form.formState.errors.admissionDate?.message}
      >
        <Input type="date" {...form.register("admissionDate")} />
      </FormField>

      <div className="md:col-span-2">
        <SubmitButton
          loading={loading}
          mode={mode}
          createLabel="Enroll Student"
          updateLabel="Update Enrollment"
          className="w-full"
        />
      </div>
      </form>

      <AlertDialog
        open={confirmationOpen}
        onOpenChange={(open) => {
          setConfirmationOpen(open);
          if (!open && !loading) {
            setPendingUpdate(null);
            setClassChangePreview(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {classChangePreview?.canChange
                ? "Confirm class and fee change"
                : "Class change blocked"}
            </AlertDialogTitle>

            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left">
                {classChangePreview && (
                  <>
                    <p>
                      Move the student from{" "}
                      <span className="font-semibold text-foreground">
                        {classChangePreview.fromClass.name}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-foreground">
                        {classChangePreview.toClass.name}
                      </span>
                      .
                    </p>

                    {classChangePreview.blockers.messages.length > 0 && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                        <p className="font-semibold">Resolve before continuing</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {classChangePreview.blockers.messages.map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <FeePlanPreviewList
                      title="Fees removed from the active ledger"
                      plans={classChangePreview.deactivatePlans}
                      emptyLabel="No class-specific fees will be removed."
                    />

                    <FeePlanPreviewList
                      title="Fees assigned for the new class"
                      plans={classChangePreview.assignPlans}
                      emptyLabel="No additional fee plans will be assigned."
                    />

                    {classChangePreview.retainPlans.length > 0 && (
                      <FeePlanPreviewList
                        title="Fees retained"
                        plans={classChangePreview.retainPlans}
                        emptyLabel=""
                      />
                    )}

                    <p className="text-xs">
                      Voided receipts remain available in payment history for
                      audit purposes.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>

            <AlertDialogAction
              type="button"
              disabled={!classChangePreview?.canChange || loading}
              onClick={() => void confirmClassChange()}
            >
              Confirm class change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FeePlanPreviewList({
  title,
  plans,
  emptyLabel,
}: {
  title: string;
  plans: FeePlanPreview[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <p className="font-semibold text-foreground">{title}</p>

      {plans.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {plans.map((plan) => (
            <li key={plan.id} className="flex items-center justify-between gap-3">
              <span>{plan.name}</span>
              <span className="font-medium text-foreground">
                {formatAmount(plan.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs">{emptyLabel}</p>
      )}
    </div>
  );
}

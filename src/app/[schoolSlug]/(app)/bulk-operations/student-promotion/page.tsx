"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MessageCircleMore,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { useSchool } from "@/contexts/school-context";
import { PromotionFileImport } from "@/features/student-enrollments/components/PromotionFileImport";

type Option = {
  id: string;
  label: string;
};

type Student = {
  id: string;
  admissionNo: string;
  fullName: string | null;
  rollNo: number | null;
};

type PromotionResult = {
  decision: "PROMOTE" | "DETAIN";
  created: number;
  skipped: number;
  notificationQueued: boolean;

  students: Array<{
    studentId: string;
    admissionNo: string;
    fullName: string | null;
    rollNo: number | null;
    className: string;
    sectionName: string;
    academicYearName: string;
  }>;

  skippedStudents: Array<{
    studentId: string;
    admissionNo: string;
    fullName: string | null;
    reason: string;
  }>;
};

type PromotionPreview = {
  decision: "PROMOTE" | "DETAIN";
  selected: number;
  eligible: number;
  alreadyEnrolled: number;
  feeWarnings: {
    students: number;
    installments: number;
    outstandingAmount: number;
  };
  resultWarnings: {
    openExams: number;
    missingCompletedMarks: number;
    studentsBelowPassMark: number;
  };
  sourceYearEnded: boolean;
  sourceAcademicYearName: string;
  targetAcademicYearName: string;
  targetClassName: string;
  targetSectionName: string;
};

type SchoolPromotionPreview = Pick<
  PromotionPreview,
  | "selected"
  | "eligible"
  | "alreadyEnrolled"
  | "feeWarnings"
  | "resultWarnings"
  | "sourceYearEnded"
  | "sourceAcademicYearName"
  | "targetAcademicYearName"
> & {
  graduatingStudents: number;
  unmappedStudents: number;
  mappings: Array<{ source: string; target: string; students: number }>;
};

type SchoolPromotionResult = {
  created: number;
  skipped: number;
  graduatingStudents: number;
  unmappedStudents: number;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function StudentPromotionPage() {
  const { school } = useSchool();

  const [academicYears, setAcademicYears] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [sourceSections, setSourceSections] = useState<Option[]>([]);
  const [targetSections, setTargetSections] = useState<Option[]>([]);

  const [fromAcademicYearId, setFromAcademicYearId] = useState("");

  const [toAcademicYearId, setToAcademicYearId] = useState("");

  const [fromClassId, setFromClassId] = useState("");

  const [fromSectionId, setFromSectionId] = useState("");

  const [toClassId, setToClassId] = useState("");

  const [toSectionId, setToSectionId] = useState("");
  const [decision, setDecision] = useState<"PROMOTE" | "DETAIN">("PROMOTE");
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [scope, setScope] = useState<"SECTION" | "SCHOOL" | "FILE">("SECTION");

  const [students, setStudents] = useState<Student[]>([]);

  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set(),
  );

  const [loadingYears, setLoadingYears] = useState(true);

  const [loadingStudents, setLoadingStudents] = useState(false);

  const [promoting, setPromoting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  const [schoolPreview, setSchoolPreview] = useState<SchoolPromotionPreview | null>(null);
  const [schoolReviewOpen, setSchoolReviewOpen] = useState(false);
  const [schoolPromoting, setSchoolPromoting] = useState(false);
  const [schoolResult, setSchoolResult] = useState<SchoolPromotionResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<PromotionResult | null>(null);

  /* ------------------------------------------------------------------ */
  /* Load academic years                                                */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    async function loadAcademicYears() {
      try {
        setLoadingYears(true);
        setError(null);

        const response = await fetch("/api/v1/academic-years/options");

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load academic years.");
        }

        setAcademicYears(Array.isArray(payload.data) ? payload.data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load academic years.",
        );
      } finally {
        setLoadingYears(false);
      }
    }

    void loadAcademicYears();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Load classes                                                       */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    async function loadClasses() {
      try {
        const response = await fetch("/api/v1/classes/options");

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load classes.");
        }

        setClasses(Array.isArray(payload.data) ? payload.data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load classes.",
        );
      }
    }

    void loadClasses();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Source sections                                                    */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!fromClassId) {
      return;
    }

    async function loadSections() {
      try {
        const response = await fetch(
          `/api/v1/sections/options?classId=${encodeURIComponent(fromClassId)}`,
        );

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load source sections.");
        }

        setSourceSections(payload.data ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load source sections.",
        );
      }
    }

    void loadSections();
  }, [fromClassId]);

  /* ------------------------------------------------------------------ */
  /* Target sections                                                    */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!toClassId) {
      return;
    }

    async function loadSections() {
      try {
        const response = await fetch(
          `/api/v1/sections/options?classId=${encodeURIComponent(toClassId)}`,
        );

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message ?? "Unable to load target sections.");
        }

        setTargetSections(payload.data ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load target sections.",
        );
      }
    }

    void loadSections();
  }, [toClassId]);

  /* ------------------------------------------------------------------ */
  /* Load students                                                      */
  /* ------------------------------------------------------------------ */

  async function loadStudents() {
    if (!fromAcademicYearId || !fromClassId || !fromSectionId) {
      setStudents([]);
      setSelectedStudents(new Set());
      return;
    }

    try {
      setLoadingStudents(true);
      setError(null);
      setResult(null);

      const params = new URLSearchParams({
        academicYearId: fromAcademicYearId,

        classId: fromClassId,

        sectionId: fromSectionId,
      });

      const response = await fetch(
        `/api/v1/student-enrollments/options?${params.toString()}`,
      );

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to load students.");
      }

      const data = Array.isArray(payload.data) ? payload.data : [];

      const filtered: Student[] = data
        .filter(
          (item: {
            student?: {
              id?: string;
              admissionNo?: string;
              fullName?: string | null;
            };
            rollNo?: number | null;
          }) => Boolean(item.student?.id),
        )
        .map(
          (item: {
            student: {
              id: string;
              admissionNo: string;
              fullName: string | null;
            };
            rollNo?: number | null;
          }) => ({
            id: item.student.id,
            admissionNo: item.student.admissionNo,
            fullName: item.student.fullName,
            rollNo: item.rollNo ?? null,
          }),
        );

      setStudents(filtered);
      setSelectedStudents(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load students.");
    } finally {
      setLoadingStudents(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Selection                                                          */
  /* ------------------------------------------------------------------ */

  const allSelected =
    students.length > 0 && selectedStudents.size === students.length;

  function toggleStudent(id: string) {
    setSelectedStudents((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedStudents(new Set());
      return;
    }

    setSelectedStudents(new Set(students.map((student) => student.id)));
  }

  /* ------------------------------------------------------------------ */
  /* Promotion preview                                                  */
  /* ------------------------------------------------------------------ */

  const selectedRows = useMemo(
    () => students.filter((student) => selectedStudents.has(student.id)),
    [students, selectedStudents],
  );

  const canPromote = Boolean(
    fromAcademicYearId &&
    toAcademicYearId &&
    fromClassId &&
    fromSectionId &&
    toClassId &&
    toSectionId &&
    selectedStudents.size > 0 &&
    !promoting &&
    !reviewing,
  );

  function promotionPayload() {
    return {
      studentIds: selectedRows.map((student) => student.id),
      sourceAcademicYearId: fromAcademicYearId,
      sourceClassId: fromClassId,
      sourceSectionId: fromSectionId,
      targetAcademicYearId: toAcademicYearId,
      targetClassId: toClassId,
      targetSectionId: toSectionId,
      decision,
    };
  }

  async function reviewPromotion() {
    if (!canPromote) return;
    try {
      setReviewing(true);
      setError(null);
      setPreview(null);
      const response = await fetch("/api/v1/student-enrollments/promote/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promotionPayload()),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to review this promotion.");
      }
      setPreview(payload.data as PromotionPreview);
      setReviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review this promotion.");
    } finally {
      setReviewing(false);
    }
  }

  async function reviewSchoolPromotion() {
    if (!fromAcademicYearId || !toAcademicYearId || reviewing) return;
    try {
      setReviewing(true);
      setError(null);
      setSchoolPreview(null);
      setSchoolResult(null);
      const response = await fetch(
        "/api/v1/student-enrollments/promote/school/preview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceAcademicYearId: fromAcademicYearId,
            targetAcademicYearId: toAcademicYearId,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Unable to review school-wide promotion.");
      }
      setSchoolPreview(payload.data as SchoolPromotionPreview);
      setSchoolReviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review school-wide promotion.");
    } finally {
      setReviewing(false);
    }
  }

  async function promoteSchool() {
    if (!schoolPreview || schoolPreview.eligible === 0) return;
    try {
      setSchoolPromoting(true);
      setError(null);
      const response = await fetch("/api/v1/student-enrollments/promote/school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAcademicYearId: fromAcademicYearId,
          targetAcademicYearId: toAcademicYearId,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "School-wide promotion failed.");
      }
      setSchoolResult(payload.data as SchoolPromotionResult);
      setSchoolReviewOpen(false);
      setSchoolPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "School-wide promotion failed.");
    } finally {
      setSchoolPromoting(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Promote                                                            */
  /* ------------------------------------------------------------------ */

  async function promoteStudents() {
    if (!canPromote) {
      return;
    }

    if (fromAcademicYearId === toAcademicYearId) {
      setError("Source and target academic year must be different.");
      return;
    }

    try {
      setPromoting(true);
      setError(null);
      setResult(null);

      const response = await fetch("/api/v1/student-enrollments/promote", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({ ...promotionPayload(), sendWhatsapp }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Student promotion failed.");
      }

      const promotionResult = payload.data as PromotionResult;

      setResult(promotionResult);
      setReviewOpen(false);
      setPreview(null);

      /*
       * Only remove students that were
       * actually promoted.
       *
       * Skipped students remain visible.
       */
      const promotedIds = new Set(
        promotionResult.students.map((student) => student.studentId),
      );

      setStudents((current) =>
        current.filter((student) => !promotedIds.has(student.id)),
      );

      setSelectedStudents(new Set());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Student promotion failed.",
      );
    } finally {
      setPromoting(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Reset                                                              */
  /* ------------------------------------------------------------------ */

  function resetPromotion() {
    setFromAcademicYearId("");
    setToAcademicYearId("");
    setFromClassId("");
    setFromSectionId("");
    setToClassId("");
    setToSectionId("");
    setDecision("PROMOTE");
    setSendWhatsapp(false);

    setSourceSections([]);
    setTargetSections([]);

    setStudents([]);
    setSelectedStudents(new Set());

    setError(null);
    setResult(null);
    setPreview(null);
    setReviewOpen(false);
    setSchoolPreview(null);
    setSchoolReviewOpen(false);
    setSchoolResult(null);
  }

  const targetAcademicYearName =
    academicYears.find((item) => item.id === toAcademicYearId)?.label ?? "—";

  const targetClassName =
    classes.find((item) => item.id === toClassId)?.label ?? "—";

  const targetSectionName =
    targetSections.find((item) => item.id === toSectionId)?.label ?? "—";

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Bulk Operations"
        title="Year-end Promotion"
        description="Review results and fee warnings, then promote students or continue them in the same class for the next academic year."
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/${school.slug}/bulk-operations`}
          className="font-semibold text-primary hover:underline"
        >
          Bulk Operations
        </Link>

        <span>/</span>

        <span>Student Promotion</span>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* ERROR                                                          */}
      {/* -------------------------------------------------------------- */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

          <div>
            <p className="text-sm font-semibold text-destructive">
              Promotion cannot continue
            </p>

            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* RESULT                                                         */}
      {/* -------------------------------------------------------------- */}

      {result && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />

            <div>
              <p className="text-sm font-semibold">Year-end update completed</p>

              <p className="mt-1 text-sm text-muted-foreground">
                {result.created} students {result.decision === "DETAIN" ? "detained" : "promoted"} successfully.
                {result.skipped > 0 && ` ${result.skipped} skipped.`}
                {result.notificationQueued && " WhatsApp updates were queued."}
              </p>
            </div>
          </div>

          {/* Skipped students */}
          {result.skippedStudents.length > 0 && (
            <Card className="overflow-hidden rounded-2xl border-amber-500/20">
              <CardHeader className="border-b border-border/60 px-6 py-4">
                <CardTitle className="text-sm">Skipped Students</CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/60 bg-muted/30">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Admission No
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Student
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Reason
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {result.skippedStudents.map((student) => (
                        <tr
                          key={student.studentId}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="px-4 py-3 font-medium">
                            {student.admissionNo}
                          </td>

                          <td className="px-4 py-3">
                            {student.fullName ?? "Unnamed Student"}
                          </td>

                          <td className="px-4 py-3 text-muted-foreground">
                            {student.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {schoolResult && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold">School-wide promotion completed</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {schoolResult.created} promoted · {schoolResult.skipped} already enrolled · {schoolResult.graduatingStudents} final-class students left unchanged · {schoolResult.unmappedStudents} need section mapping.
            </p>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* SOURCE                                                         */}
      {/* -------------------------------------------------------------- */}

      <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>

            <div>
              <CardTitle>Source</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Select the students to promote.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-6 md:grid-cols-4">
          <SelectField
            label="Promotion Scope"
            value={scope}
            onChange={(value) => {
              setScope(value as "SECTION" | "SCHOOL" | "FILE");
              setStudents([]);
              setSelectedStudents(new Set());
              setResult(null);
              setSchoolResult(null);
            }}
            options={[
              { id: "SECTION", label: "Selected class and section" },
              { id: "SCHOOL", label: "Whole school" },
              { id: "FILE", label: "Excel or CSV file" },
            ]}
          />

          {scope !== "FILE" && <SelectField
            label="Academic Year"
            value={fromAcademicYearId}
            onChange={(value) => {
              setFromAcademicYearId(value);
              setStudents([]);
              setSelectedStudents(new Set());
              setResult(null);
              setPreview(null);
            }}
            options={academicYears}
            disabled={loadingYears}
          />}

          {scope === "SECTION" && <SelectField
            label="Class"
            value={fromClassId}
            onChange={(value) => {
              setFromClassId(value);
              setFromSectionId("");
              setSourceSections([]);
              setStudents([]);
              setSelectedStudents(new Set());
              if (decision === "DETAIN") {
                setToClassId(value);
                setToSectionId("");
                setTargetSections([]);
              }
              setError(null);
              setResult(null);
            }}
            options={classes}
          />}

          {scope === "SECTION" && <SelectField
            label="Section"
            value={fromSectionId}
            onChange={(value) => {
              setFromSectionId(value);
              setStudents([]);
              setSelectedStudents(new Set());
              setResult(null);
              setPreview(null);
            }}
            options={sourceSections}
            disabled={!fromClassId}
          />}

          {scope === "SECTION" && <div className="flex justify-end md:col-span-4">
            <Button
              variant="outline"
              disabled={
                !fromAcademicYearId ||
                !fromClassId ||
                !fromSectionId ||
                loadingStudents
              }
              onClick={() => void loadStudents()}
            >
              {loadingStudents && <Loader2 className="size-4 animate-spin" />}

              {loadingStudents ? "Loading Students..." : "Load Students"}
            </Button>
          </div>}
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------- */}
      {/* TARGET                                                         */}
      {/* -------------------------------------------------------------- */}

      {scope !== "FILE" && <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <GraduationCap className="size-5" />
            </div>

            <div>
              <CardTitle>Target</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Select where the students will be enrolled.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-6 md:grid-cols-4">
          {scope === "SECTION" && <SelectField
            label="Decision"
            value={decision}
            onChange={(value) => {
              const next = value as "PROMOTE" | "DETAIN";
              setDecision(next);
              setPreview(null);
              setToSectionId("");
              if (next === "DETAIN") setToClassId(fromClassId);
            }}
            options={[
              { id: "PROMOTE", label: "Promote to next class" },
              { id: "DETAIN", label: "Continue in same class" },
            ]}
          />}

          <SelectField
            label="Academic Year"
            value={toAcademicYearId}
            onChange={(value) => {
              setToAcademicYearId(value);
              setResult(null);
              setPreview(null);
            }}
            options={academicYears}
            disabled={loadingYears}
          />

          {scope === "SECTION" && <SelectField
            label="Class"
            value={toClassId}
            onChange={(value) => {
              setToClassId(value);
              setToSectionId("");
              setTargetSections([]);
              setResult(null);
              setPreview(null);
            }}
            options={classes}
            disabled={decision === "DETAIN" || !fromClassId}
          />}

          {scope === "SECTION" && <SelectField
            label="Section"
            value={toSectionId}
            onChange={(value) => {
              setToSectionId(value);
              setResult(null);
              setPreview(null);
            }}
            options={targetSections}
            disabled={!toClassId}
          />}
        </CardContent>
      </Card>}

      {scope === "SCHOOL" && (
        <Card className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-violet-500/[0.06]">
          <CardContent className="flex flex-col items-start justify-between gap-5 p-6 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Building2 className="size-6" />
              </div>
              <div>
                <p className="font-bold">Promote the whole school</p>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Classes follow display order and sections match by name. The final class and unsafe section matches stay unchanged for manual review.
                </p>
              </div>
            </div>
            <Button
              disabled={!fromAcademicYearId || !toAcademicYearId || reviewing}
              onClick={() => void reviewSchoolPromotion()}
            >
              {reviewing ? <Loader2 className="size-4 animate-spin" /> : <Building2 className="size-4" />}
              {reviewing ? "Checking all students..." : "Review all students"}
            </Button>
          </CardContent>
        </Card>
      )}

      {scope === "FILE" && <PromotionFileImport />}

      {/* -------------------------------------------------------------- */}
      {/* FLOW                                                           */}
      {/* -------------------------------------------------------------- */}

      {scope === "SECTION" && <div className="hidden items-center justify-center gap-4 md:flex">
        <div className="rounded-xl border border-border/60 bg-card px-5 py-3 text-sm font-semibold">
          Source
        </div>

        <ArrowRight className="size-5 text-muted-foreground" />

        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary">
          {decision === "DETAIN" ? "Detain" : "Promote"}
        </div>

        <ArrowRight className="size-5 text-muted-foreground" />

        <div className="rounded-xl border border-border/60 bg-card px-5 py-3 text-sm font-semibold">
          Target
        </div>
      </div>}

      {/* -------------------------------------------------------------- */}
      {/* STUDENTS                                                       */}
      {/* -------------------------------------------------------------- */}

      {scope === "SECTION" && <Card className="premium-card overflow-hidden rounded-2xl border-0">
        <CardHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Students</CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Select the students to include in this year-end decision.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">{students.length} students</Badge>

              <Badge variant={selectedStudents.size ? "success" : "secondary"}>
                {selectedStudents.size} selected
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Users className="size-5" />
              </div>

              <p className="mt-3 text-sm font-semibold">No students loaded</p>

              <p className="mt-1 text-xs text-muted-foreground">
                Select the source academic year, class and section, then click
                Load Students.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/30">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all students"
                        className="size-4 rounded border-border"
                      />
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      #
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Admission No
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Student
                    </th>

                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Current Roll No
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student, index) => {
                    const selected = selectedStudents.has(student.id);

                    return (
                      <tr
                        key={student.id}
                        className={`border-b border-border/40 last:border-0 ${
                          selected ? "bg-primary/[0.04]" : "hover:bg-muted/20"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleStudent(student.id)}
                            aria-label={`Select ${student.fullName ?? student.admissionNo}`}
                            className="size-4 rounded border-border"
                          />
                        </td>

                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3 font-medium">
                          {student.admissionNo}
                        </td>

                        <td className="px-4 py-3">
                          {student.fullName ?? "Unnamed Student"}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {student.rollNo ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>}

      {/* -------------------------------------------------------------- */}
      {/* CONFIRMATION                                                   */}
      {/* -------------------------------------------------------------- */}

      {selectedRows.length > 0 && (
        <Card className="premium-card overflow-hidden rounded-2xl border-0">
          <CardHeader className="border-b border-border/60 px-6 py-5">
            <CardTitle>Year-end Summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryItem
                label="Students"
                value={String(selectedRows.length)}
              />

              <SummaryItem
                label="Decision"
                value={decision === "DETAIN" ? "Continue in same class" : "Promote"}
              />

              <SummaryItem
                label="Target Academic Year"
                value={targetAcademicYearName}
              />

              <SummaryItem label="Target Class" value={targetClassName} />

              <SummaryItem label="Target Section" value={targetSectionName} />
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary">Roll numbers</p>

              <p className="mt-1 text-xs text-muted-foreground">
                New roll numbers will be assigned automatically using the next
                available roll number in the target class and section.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <MessageCircleMore className="mt-0.5 size-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold">WhatsApp parent update</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Queue an academic update for opted-in students after completion.
                  </p>
                </div>
              </div>
              <Switch checked={sendWhatsapp} onCheckedChange={setSendWhatsapp} />
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-5">
              <Button
                variant="outline"
                onClick={resetPromotion}
                disabled={promoting}
              >
                Reset
              </Button>

              <Button
                disabled={!canPromote}
                onClick={() => void reviewPromotion()}
              >
                {reviewing && <Loader2 className="size-4 animate-spin" />}

                {reviewing
                  ? "Checking records..."
                  : `Review ${selectedRows.length} Students`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <AlertDialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {decision === "DETAIN" ? "detention" : "promotion"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This creates the next academic-year enrollment and closes the current active enrollment for every eligible student.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {preview && (
            <div className="space-y-3">
              {!preview.sourceYearEnded && (
                <WarningRow
                  icon={AlertTriangle}
                  title="Source academic year is still running"
                  detail="You may continue, but confirm that this early year-end change is intentional."
                  tone="amber"
                />
              )}
              <WarningRow
                icon={WalletCards}
                title={`${preview.feeWarnings.students} students have fee dues`}
                detail={`${preview.feeWarnings.installments} pending/partial installments · ${inr.format(preview.feeWarnings.outstandingAmount)} outstanding`}
                tone={preview.feeWarnings.students ? "amber" : "green"}
              />
              <WarningRow
                icon={BookOpenCheck}
                title={`${preview.resultWarnings.studentsBelowPassMark} students below pass mark`}
                detail={`${preview.resultWarnings.openExams} exams still open · ${preview.resultWarnings.missingCompletedMarks} completed-exam marks missing`}
                tone={
                  preview.resultWarnings.openExams ||
                  preview.resultWarnings.missingCompletedMarks ||
                  preview.resultWarnings.studentsBelowPassMark
                    ? "amber"
                    : "green"
                }
              />
              {preview.alreadyEnrolled > 0 && (
                <WarningRow
                  icon={Users}
                  title={`${preview.alreadyEnrolled} already enrolled`}
                  detail="They will be skipped; existing target enrollments will not be changed."
                  tone="amber"
                />
              )}
              <div className="rounded-xl bg-primary/5 p-4 text-sm">
                <span className="font-semibold">{preview.eligible} eligible:</span>{" "}
                {preview.sourceAcademicYearName} → {preview.targetAcademicYearName}, {preview.targetClassName} — {preview.targetSectionName}
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={promoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={promoting || !preview || preview.eligible === 0}
              onClick={(event) => {
                event.preventDefault();
                void promoteStudents();
              }}
            >
              {promoting && <Loader2 className="size-4 animate-spin" />}
              {promoting
                ? "Saving..."
                : `Confirm ${decision === "DETAIN" ? "detention" : "promotion"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={schoolReviewOpen} onOpenChange={setSchoolReviewOpen}>
        <AlertDialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm whole-school promotion</AlertDialogTitle>
            <AlertDialogDescription>
              This closes current enrollments and creates next-year enrollments for every eligible mapped student.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {schoolPreview && (
            <div className="space-y-3">
              {!schoolPreview.sourceYearEnded && (
                <WarningRow icon={AlertTriangle} title="Source academic year is still running" detail="Confirm that this early school-wide change is intentional." tone="amber" />
              )}
              <WarningRow
                icon={WalletCards}
                title={`${schoolPreview.feeWarnings.students} students have fee dues`}
                detail={`${schoolPreview.feeWarnings.installments} installments · ${inr.format(schoolPreview.feeWarnings.outstandingAmount)} outstanding`}
                tone={schoolPreview.feeWarnings.students ? "amber" : "green"}
              />
              <WarningRow
                icon={BookOpenCheck}
                title={`${schoolPreview.resultWarnings.studentsBelowPassMark} students below pass mark`}
                detail={`${schoolPreview.resultWarnings.openExams} exams open · ${schoolPreview.resultWarnings.missingCompletedMarks} completed-exam marks missing`}
                tone={schoolPreview.resultWarnings.openExams || schoolPreview.resultWarnings.missingCompletedMarks || schoolPreview.resultWarnings.studentsBelowPassMark ? "amber" : "green"}
              />
              {(schoolPreview.graduatingStudents > 0 || schoolPreview.unmappedStudents > 0) && (
                <WarningRow
                  icon={Users}
                  title={`${schoolPreview.graduatingStudents + schoolPreview.unmappedStudents} students require manual action`}
                  detail={`${schoolPreview.graduatingStudents} are in the final class; ${schoolPreview.unmappedStudents} have no safe target-section match.`}
                  tone="amber"
                />
              )}
              <div className="max-h-52 overflow-y-auto rounded-xl border border-border/60">
                {schoolPreview.mappings.map((mapping) => (
                  <div key={mapping.source} className="flex items-center justify-between gap-4 border-b border-border/50 px-4 py-3 text-sm last:border-0">
                    <span>{mapping.source} <ArrowRight className="mx-2 inline size-3" /> {mapping.target}</span>
                    <Badge variant="secondary">{mapping.students}</Badge>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-primary/5 p-4 text-sm">
                <span className="font-semibold">{schoolPreview.eligible} eligible</span> of {schoolPreview.selected} active students · {schoolPreview.alreadyEnrolled} already enrolled and skipped.
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={schoolPromoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={schoolPromoting || !schoolPreview || schoolPreview.eligible === 0}
              onClick={(event) => {
                event.preventDefault();
                void promoteSchool();
              }}
            >
              {schoolPromoting && <Loader2 className="size-4 animate-spin" />}
              {schoolPromoting ? "Promoting school..." : `Promote ${schoolPreview?.eligible ?? 0} students`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SELECT FIELD                                                              */
/* -------------------------------------------------------------------------- */

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold text-foreground">{label}</span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Select {label}</option>

        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* SUMMARY ITEM                                                              */
/* -------------------------------------------------------------------------- */

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function WarningRow({
  icon: Icon,
  title,
  detail,
  tone,
}: {
  icon: typeof AlertTriangle;
  title: string;
  detail: string;
  tone: "amber" | "green";
}) {
  return (
    <div
      className={`flex gap-3 rounded-xl border p-4 ${
        tone === "amber"
          ? "border-amber-500/20 bg-amber-500/5"
          : "border-emerald-500/20 bg-emerald-500/5"
      }`}
    >
      <Icon className={`mt-0.5 size-5 shrink-0 ${tone === "amber" ? "text-amber-600" : "text-emerald-600"}`} />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

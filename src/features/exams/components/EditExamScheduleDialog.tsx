"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ClassSelect, SectionSelect } from "@/components/common/select";

import { RemoteCombobox } from "@/components/common/combobox/RemoteCombobox";

type ExamSchedule = {
  id: string;

  examDate: string;
  startTime: string | null;
  endTime: string | null;

  maxMarks: string | number;
  passMarks: string | number | null;

  class: {
    id: string;
    name: string;
  };

  section: {
    id: string;
    name: string;
  } | null;

  subject: {
    id: string;
    name: string;
    code: string | null;
  };
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  examId: string;

  schedule: ExamSchedule | null;

  startDate: string | null;
  endDate: string | null;

  onSuccess: () => void;
};

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";

  return value.slice(0, 10);
}

export function EditExamScheduleDialog({
  open,
  onOpenChange,
  examId,
  schedule,
  startDate,
  endDate,
  onSuccess,
}: Props) {
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [examDate, setExamDate] = useState("");

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [maxMarks, setMaxMarks] = useState("");
  const [passMarks, setPassMarks] = useState("");

  const [saving, setSaving] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Load schedule data                                                     */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!open || !schedule) return;

    setClassId(schedule.class.id);
    setSectionId(schedule.section?.id ?? "");
    setSubjectId(schedule.subject.id);

    setExamDate(toDateInputValue(schedule.examDate));

    setStartTime(schedule.startTime ?? "");
    setEndTime(schedule.endTime ?? "");

    setMaxMarks(String(schedule.maxMarks));

    setPassMarks(schedule.passMarks !== null ? String(schedule.passMarks) : "");
  }, [open, schedule]);

  /* ---------------------------------------------------------------------- */
  /* Class change                                                           */
  /* ---------------------------------------------------------------------- */

  function handleClassChange(value: string) {
    setClassId(value);
    setSectionId("");
  }

  /* ---------------------------------------------------------------------- */
  /* Submit                                                                 */
  /* ---------------------------------------------------------------------- */

  async function submit() {
    if (!schedule) return;

    if (!classId) {
      toast.error("Please select a class.");
      return;
    }

    if (!subjectId) {
      toast.error("Please select a subject.");
      return;
    }

    if (!examDate) {
      toast.error("Exam date is required.");
      return;
    }

    const examStartDate = toDateInputValue(startDate);
    const examEndDate = toDateInputValue(endDate);

    if (examStartDate && examDate < examStartDate) {
      toast.error("Exam date cannot be before the exam start date.");
      return;
    }

    if (examEndDate && examDate > examEndDate) {
      toast.error("Exam date cannot be after the exam end date.");
      return;
    }

    if (!maxMarks.trim()) {
      toast.error("Maximum marks are required.");
      return;
    }

    const parsedMaxMarks = Number(maxMarks);

    if (!Number.isFinite(parsedMaxMarks) || parsedMaxMarks <= 0) {
      toast.error("Maximum marks must be greater than zero.");
      return;
    }

    let parsedPassMarks: number | null = null;

    if (passMarks.trim()) {
      parsedPassMarks = Number(passMarks);

      if (!Number.isFinite(parsedPassMarks) || parsedPassMarks < 0) {
        toast.error("Pass marks must be zero or greater.");
        return;
      }

      if (parsedPassMarks > parsedMaxMarks) {
        toast.error("Pass marks cannot be greater than maximum marks.");
        return;
      }
    }

    if (startTime && endTime && endTime <= startTime) {
      toast.error("End time must be after start time.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/v1/exams/${examId}/schedules/${schedule.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            classId,

            sectionId: sectionId || null,

            subjectId,

            examDate,

            startTime: startTime || null,

            endTime: endTime || null,

            maxMarks: parsedMaxMarks,

            passMarks: parsedPassMarks,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to update exam schedule.");
        return;
      }

      toast.success("Exam schedule updated successfully.");

      onOpenChange(false);

      onSuccess();
    } catch (error) {
      console.error("Update exam schedule error:", error);

      toast.error("Failed to update exam schedule.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Exam Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Class</label>

            <ClassSelect value={classId} onChange={handleClassChange} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Section</label>

            <SectionSelect
              value={sectionId}
              onChange={setSectionId}
              classId={classId}
              disabled={saving || !classId}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>

            <RemoteCombobox
              url="/api/v1/subjects/options"
              value={subjectId}
              onChange={setSubjectId}
              disabled={saving}
              placeholder="Select Subject"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Exam Date</label>

            <Input
              type="date"
              value={examDate}
              min={toDateInputValue(startDate) || undefined}
              max={toDateInputValue(endDate) || undefined}
              onChange={(event) => setExamDate(event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Time</label>

              <Input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Time</label>

              <Input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Maximum Marks</label>

              <Input
                type="number"
                min="1"
                step="0.01"
                value={maxMarks}
                onChange={(event) => setMaxMarks(event.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pass Marks</label>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={passMarks}
                onChange={(event) => setPassMarks(event.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={saving || !schedule}
              onClick={() => void submit()}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

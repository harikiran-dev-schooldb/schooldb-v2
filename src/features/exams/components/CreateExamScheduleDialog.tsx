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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  examId: string;
  schoolSlug: string;

  startDate: string | null;
  endDate: string | null;

  onSuccess: () => void;
};

function toDateInputValue(value: string | null) {
  if (!value) return undefined;

  return value.slice(0, 10);
}

export function CreateExamScheduleDialog({
  open,
  onOpenChange,
  examId,
  schoolSlug: _schoolSlug,
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
  /* Reset form                                                             */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!open) return;

    setClassId("");
    setSectionId("");
    setSubjectId("");

    // Default to exam start date if available
    setExamDate(toDateInputValue(startDate) ?? "");

    setStartTime("");
    setEndTime("");

    setMaxMarks("");
    setPassMarks("");
  }, [open, startDate]);

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

    if (!maxMarks || maxMarks.trim() === "") {
      toast.error("Maximum marks are required.");
      return;
    }

    const parsedMaxMarks = Number(maxMarks);

    if (!Number.isFinite(parsedMaxMarks) || parsedMaxMarks <= 0) {
      toast.error("Maximum marks must be greater than zero.");
      return;
    }

    let parsedPassMarks: number | null = null;

    if (passMarks.trim() !== "") {
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

      const response = await fetch(`/api/v1/exams/${examId}/schedules`, {
        method: "POST",

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
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.message || "Failed to create exam schedule.";

        if (
          message.includes("Unique constraint") ||
          message.includes("P2002")
        ) {
          toast.error(
            "This subject is already scheduled for the selected class and section.",
          );
        } else {
          toast.error(message);
        }

        return;
      }

      toast.success("Exam schedule created successfully.");

      onOpenChange(false);

      onSuccess();
    } catch (error) {
      console.error("Create exam schedule error:", error);

      toast.error("Failed to create exam schedule.");
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
          <DialogTitle>Add Exam Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Class */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Class</label>

            <ClassSelect value={classId} onChange={handleClassChange} />
          </div>

          {/* Section */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Section</label>

            <SectionSelect
              value={sectionId}
              onChange={setSectionId}
              classId={classId}
              disabled={saving || !classId}
            />
          </div>

          {/* Subject */}

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

          {/* Exam Date */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Exam Date</label>

            <Input
              type="date"
              value={examDate}
              min={toDateInputValue(startDate)}
              max={toDateInputValue(endDate)}
              onChange={(event) => setExamDate(event.target.value)}
              disabled={saving}
            />

            {(startDate || endDate) && (
              <p className="text-xs text-muted-foreground">
                {startDate && endDate
                  ? `Select a date between ${toDateInputValue(
                      startDate,
                    )} and ${toDateInputValue(endDate)}.`
                  : startDate
                    ? `Exam starts on ${toDateInputValue(startDate)}.`
                    : `Exam ends on ${toDateInputValue(endDate)}.`}
              </p>
            )}
          </div>

          {/* Time */}

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

          {/* Marks */}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Maximum Marks</label>

              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="100"
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
                placeholder="35"
                value={passMarks}
                onChange={(event) => setPassMarks(event.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Actions */}

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
              disabled={saving}
              onClick={() => void submit()}
            >
              {saving ? "Saving..." : "Add Schedule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

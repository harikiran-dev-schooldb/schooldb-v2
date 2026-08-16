"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AcademicYearSelect } from "@/components/common/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CreateExamDialog({ open, onOpenChange, onSuccess }: Props) {
  const [academicYearId, setAcademicYearId] = useState("");

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!academicYearId) {
      toast.error("Please select an academic year.");
      return;
    }

    if (!name.trim()) {
      toast.error("Exam name is required.");
      return;
    }

    if (!startDate) {
      toast.error("Start date is required.");
      return;
    }

    if (!endDate) {
      toast.error("End date is required.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date must be on or after the start date.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/v1/exams", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          academicYearId,
          name: name.trim(),
          startDate,
          endDate,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to create exam.");
        return;
      }

      toast.success("Exam created successfully.");

      setAcademicYearId("");
      setName("");
      setStartDate("");
      setEndDate("");

      onOpenChange(false);

      onSuccess();
    } catch (error) {
      console.error("Create exam error:", error);

      toast.error("Failed to create exam.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Exam</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Academic Year */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Academic Year</label>

            <AcademicYearSelect
              value={academicYearId}
              onChange={setAcademicYearId}
              disabled={saving}
            />
          </div>

          {/* Exam Name */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Exam Name</label>

            <Input
              placeholder="Example: Quarterly Exam 1"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
            />
          </div>

          {/* Start Date */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>

            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={saving}
            />
          </div>

          {/* End Date */}

          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>

            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              disabled={saving}
            />
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
              {saving ? "Creating..." : "Create Exam"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

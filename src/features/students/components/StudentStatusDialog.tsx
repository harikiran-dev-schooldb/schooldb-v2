"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { StudentStatus } from "../constants/student-status";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
};

export function StudentStatusDialog({ open, onOpenChange, studentId }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StudentStatus>(StudentStatus.ACTIVE);
  const [remarks, setRemarks] = useState("");

  async function handleSave() {
    try {
      setLoading(true);

      const res = await fetch(`/api/v1/students/${studentId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          remarks,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Student status updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Unable to update student status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-3xl border-border/70 bg-background p-0 shadow-2xl sm:max-w-md">
        {/* Header */}
        <DialogHeader className="relative overflow-hidden border-b border-border/60 px-6 py-6">
          <div className="absolute -right-10 -top-10 size-32 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/10">
              <RefreshCw className="size-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-amber-600 uppercase">
                Student Management
              </p>

              <DialogTitle className="mt-1 text-xl font-bold tracking-tight">
                Change Student Status
              </DialogTitle>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Update the student's current enrollment or academic status.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              New status
            </label>

            <Select
              value={status}
              onValueChange={(value) => setStatus(value as StudentStatus)}
            >
              <SelectTrigger className="h-11 rounded-xl border-border/70 bg-muted/20 font-medium shadow-sm transition-colors hover:border-primary/30">
                <SelectValue placeholder="Select student status" />
              </SelectTrigger>

              <SelectContent className="rounded-xl border-border/70 p-1.5 shadow-xl">
                <SelectItem value="ACTIVE" className="rounded-lg py-2.5">
                  Active
                </SelectItem>

                <SelectItem value="INACTIVE" className="rounded-lg py-2.5">
                  Inactive
                </SelectItem>

                <SelectItem value="TC_ISSUED" className="rounded-lg py-2.5">
                  TC Issued
                </SelectItem>

                <SelectItem value="NOT_COMING" className="rounded-lg py-2.5">
                  Not Coming
                </SelectItem>

                <SelectItem value="DROPPED" className="rounded-lg py-2.5">
                  Dropped
                </SelectItem>

                <SelectItem value="ALUMNI" className="rounded-lg py-2.5">
                  Alumni
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Remarks
              <span className="ml-1 font-normal text-muted-foreground">
                (optional)
              </span>
            </label>

            <Textarea
              rows={4}
              placeholder="Add a note about this status change..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="resize-none rounded-xl border-border/70 bg-muted/20 shadow-sm transition-colors focus:bg-background"
            />
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-3.5">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-primary" />

            <p className="text-xs leading-5 text-muted-foreground">
              Changing a student's status affects how they appear across student
              records and school operations.
            </p>
          </div>

          <Button
            className="h-11 w-full rounded-xl font-semibold shadow-lg shadow-primary/15 transition-all hover:-translate-y-0.5 hover:shadow-primary/25"
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Updating Status...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                Update Student Status
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 border-t border-border/50 bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
          <GraduationCap className="size-3.5 text-primary" />
          Changes are applied to the student's school record.
        </div>
      </DialogContent>
    </Dialog>
  );
}

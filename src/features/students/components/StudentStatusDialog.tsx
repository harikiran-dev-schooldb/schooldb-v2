"use client";

import { useState } from "react";

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

import { toast } from "sonner";
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

      toast.success("Status updated");

      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Student Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as StudentStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>

              <SelectItem value="INACTIVE">Inactive</SelectItem>

              <SelectItem value="TC_ISSUED">TC Issued</SelectItem>

              <SelectItem value="DROPPED">Dropped</SelectItem>

              <SelectItem value="ALUMNI">Alumni</SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            rows={4}
            placeholder="Remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />

          <Button className="w-full" disabled={loading} onClick={handleSave}>
            {loading ? "Saving..." : "Update Status"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

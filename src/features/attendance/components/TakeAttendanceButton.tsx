"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  timetableId: string;
};

export function TakeAttendanceButton({ timetableId }: Props) {
  const router = useRouter();
  const params = useParams();

  const schoolSlug = params.schoolSlug as string;

  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);

      const response = await fetch("/api/v1/attendance/session", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          timetableId,
          attendanceDate: new Date().toISOString().split("T")[0],
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      router.push(`/${schoolSlug}/attendance/session/${result.data.id}`);
    } catch {
      toast.error("Unable to open attendance.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={handleClick}
    >
      <ClipboardCheck className="mr-2 h-4 w-4" />

      {loading ? "Opening..." : "Take Attendance"}
    </Button>
  );
}

"use client";

import { useRouter } from "next/navigation";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  timetableId: string;
};

export function AddAttendanceButton({ timetableId }: Props) {
  const router = useRouter();

  async function handleClick() {
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
      return;
    }

    router.push(`/attendance/session/${result.data.id}`);
  }

  return (
    <Button onClick={handleClick}>
      <Plus className="mr-2 h-4 w-4" />
      Take Attendance
    </Button>
  );
}

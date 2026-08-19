"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";

type Props = {
  rollNo: number;
  admissionNo: string;
  fullName: string;

  value: AttendanceStatus;

  onChange: (value: AttendanceStatus) => void;
};

export function StudentAttendanceRow({
  rollNo,
  admissionNo,
  fullName,
  value,
  onChange,
}: Props) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <div className="font-medium">
          {rollNo}. {fullName}
        </div>

        <div className="text-sm text-muted-foreground">{admissionNo}</div>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as AttendanceStatus)}
        className="flex gap-4"
      >
        <Label className="flex items-center gap-2">
          <RadioGroupItem value="PRESENT" />P
        </Label>

        <Label className="flex items-center gap-2">
          <RadioGroupItem value="ABSENT" />A
        </Label>

        <Label className="flex items-center gap-2">
          <RadioGroupItem value="LATE" />L
        </Label>

        <Label className="flex items-center gap-2">
          <RadioGroupItem value="LEAVE" />
          LV
        </Label>
      </RadioGroup>
    </div>
  );
}

"use client";

import { FormEvent, ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type TeacherOption = {
  id: string;
  employeeId: string;
  fullName: string;
  designation: string | null;
};
export type StudentOption = {
  id: string;
  admissionNo: string;
  fullName: string | null;
};
export type Row = Record<string, unknown>;

export type OperationsData = {
  teachers?: TeacherOption[];
  students?: StudentOption[];
  attendance?: Row[];
  leaves?: Row[];
  salaries?: Row[];
  payrollRuns?: Row[];
  payrollEntries?: Row[];
  visitors?: Row[];
  records?: Row[];
  visits?: Row[];
  items?: Row[];
  authorizations?: Row[];
  tickets?: Row[];
  metrics?: Row;
};

export const titleCase = (value: unknown) =>
  String(value ?? "—")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
export const display = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value);
export const nested = (row: Row, key: string, child: string) =>
  row[key] && typeof row[key] === "object"
    ? display((row[key] as Row)[child])
    : "—";
export const formatDate = (value: unknown) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
        new Date(String(value)),
      )
    : "—";
export const formatDateTime = (value: unknown) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(String(value)))
    : "—";
export const formatCurrency = (value: unknown) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export async function operationRequest(action: string, data: unknown) {
  const response = await fetch("/api/v1/operations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const result = await response.json();
  if (!response.ok || !result.success)
    throw new Error(result.message || "Unable to save changes.");
  return result.data;
}

export function formValues(form: HTMLFormElement) {
  const result: Record<string, unknown> = Object.fromEntries(
    new FormData(form),
  );
  for (const control of Array.from(form.elements)) {
    if (
      control instanceof HTMLInputElement &&
      control.type === "checkbox" &&
      control.name
    )
      result[control.name] = control.checked;
  }
  return result;
}

export function useOperationMutation() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function mutate(
    action: string,
    data: unknown,
    options?: { success?: string; after?: () => void },
  ) {
    startTransition(async () => {
      try {
        await operationRequest(action, data);
        toast.success(options?.success ?? "Saved successfully.");
        options?.after?.();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to save changes.",
        );
      }
    });
  }
  function submit(
    action: string,
    event: FormEvent<HTMLFormElement>,
    extra?: Record<string, unknown>,
    success?: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    mutate(
      action,
      { ...formValues(form), ...extra },
      { success, after: () => form.reset() },
    );
  }
  return { pending, mutate, submit };
}

export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? (
        <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function SelectField({
  name,
  placeholder,
  options,
  defaultValue,
  value,
  onValueChange,
}: {
  name: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <Select
      name={name}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EntityCombobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search…",
  empty = "No matching record.",
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
  placeholder: string;
  searchPlaceholder?: string;
  empty?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between font-normal"
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{empty}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.description ?? ""}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{option.label}</p>
                    {option.description ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function StatusBadge({ value }: { value: unknown }) {
  const status = String(value ?? "UNKNOWN");
  const variant = [
    "PAID",
    "PRESENT",
    "APPROVED",
    "ACTIVE",
    "RESOLVED",
    "CHECKED_OUT",
  ].includes(status)
    ? "success"
    : ["REJECTED", "REVOKED", "URGENT", "DAMAGED", "ABSENT"].includes(status)
      ? "destructive"
      : ["PENDING", "OPEN", "ON_HOLD", "HALF_DAY"].includes(status)
        ? "warning"
        : "info";
  return <Badge variant={variant}>{titleCase(status)}</Badge>;
}

export function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/15 px-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "indigo",
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "indigo" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
        </div>
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl",
            tones[tone],
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
      {detail ? (
        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

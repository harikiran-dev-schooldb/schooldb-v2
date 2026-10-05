"use client";

import { FormEvent, useState } from "react";
import { Loader2, Pencil, Plus, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { refreshTable } from "@/lib/table-event";

export function CreateStaffAccountButton({
  canCreateAdministrators,
}: {
  canCreateAdministrators: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [preset, setPreset] = useState("RECEPTIONIST");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);

    try {
      const response = await fetch("/api/v1/staff-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          phone: form.get("phone"),
          preset,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to create account.");
      }

      toast.success("Staff WhatsApp login created");
      setOpen(false);
      refreshTable("staff-accounts");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create account.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Create staff user
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create staff user</DialogTitle>
            <DialogDescription>
              The user will sign in using a WhatsApp OTP sent to this mobile
              number.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-6">
            <div className="grid gap-2">
              <Label htmlFor="staff-name">Full name</Label>
              <Input
                id="staff-name"
                name="fullName"
                required
                placeholder="Enter staff member name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="staff-phone">Registered mobile number</Label>
              <Input
                id="staff-phone"
                name="phone"
                inputMode="numeric"
                required
                placeholder="10-digit mobile number"
              />
            </div>

            <div className="grid gap-2">
              <Label>Position and access</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canCreateAdministrators ? (
                    <SelectItem value="SCHOOL_ADMIN">
                      School Administrator
                    </SelectItem>
                  ) : null}
                  {canCreateAdministrators ? (
                    <SelectItem value="PRINCIPAL">Principal</SelectItem>
                  ) : null}
                  {canCreateAdministrators ? (
                    <SelectItem value="VICE_PRINCIPAL">
                      Vice Principal
                    </SelectItem>
                  ) : null}
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground">
              Teachers are created from the Teachers page so their login stays
              linked to allocations, attendance, and homework.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Create login
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type EditableStaffAccount = {
  id: string;
  name: string;
  phone: string;
  role: string;
  designation: string;
  isActive: boolean;
};

export function EditStaffAccountButton({
  account,
}: {
  account: EditableStaffAccount;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [fullName, setFullName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone);
  const [designation, setDesignation] = useState(
    account.designation || roleLabel(account.role),
  );
  const [role, setRole] = useState(account.role);
  const [active, setActive] = useState(account.isActive);

  const isTeacher = account.role === "TEACHER";

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setFullName(account.name);
      setPhone(account.phone);
      setDesignation(account.designation || roleLabel(account.role));
      setRole(account.role);
      setActive(account.isActive);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      const response = await fetch(`/api/v1/staff-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          designation,
          role,
          active,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to update staff user.");
      }

      toast.success("Staff user updated");
      setOpen(false);
      refreshTable("staff-accounts");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update staff user.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Edit staff user</DialogTitle>
            <DialogDescription>
              Update the user profile, registered mobile number, role, and
              workspace access.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-6">
            <div className="grid gap-2">
              <Label htmlFor={`edit-staff-name-${account.id}`}>
                Full name
              </Label>
              <Input
                id={`edit-staff-name-${account.id}`}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                placeholder="Enter staff member name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`edit-staff-phone-${account.id}`}>
                Registered mobile number
              </Label>
              <Input
                id={`edit-staff-phone-${account.id}`}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="numeric"
                required
                placeholder="10-digit mobile number"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                This number is used for the user&apos;s WhatsApp OTP login.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`edit-staff-designation-${account.id}`}>
                Designation
              </Label>
              <Input
                id={`edit-staff-designation-${account.id}`}
                value={designation}
                onChange={(event) => setDesignation(event.target.value)}
                required
                placeholder="Principal, Accountant, Receptionist..."
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={role}
                  onValueChange={setRole}
                  disabled={isTeacher}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isTeacher ? (
                      <SelectItem value="TEACHER">Teacher</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="SCHOOL_ADMIN">
                          School Admin
                        </SelectItem>
                        <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                        <SelectItem value="RECEPTIONIST">
                          Receptionist
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Access status</Label>
                <Select
                  value={active ? "ACTIVE" : "DISABLED"}
                  onValueChange={(value) => setActive(value === "ACTIVE")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isTeacher ? (
              <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-700">
                Teacher role is locked here because this login is linked to the
                teacher profile, timetable, allocations, attendance, and
                homework.
              </p>
            ) : (
              <p className="rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground">
                Super Admin can change School Admin, Accountant, and
                Receptionist roles. Teacher accounts must be managed as
                teachers.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StaffAccountStatusButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const button = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={active ? undefined : toggle}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
      {active ? "Disable" : "Enable"}
    </Button>
  );

  async function toggle() {
    setPending(true);

    try {
      const response = await fetch(`/api/v1/staff-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to update account.");
      }

      toast.success(active ? "Account disabled" : "Account enabled");
      refreshTable("staff-accounts");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update account.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!active) return button;

  return (
    <ConfirmDialog
      trigger={button}
      title="Disable this staff account?"
      description="This person will no longer be able to sign in to this school workspace."
      confirmLabel="Disable access"
      tone="destructive"
      consequence="You can restore access later from the staff directory."
      pending={pending}
      onConfirm={() => void toggle()}
    />
  );
}

function roleLabel(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Administrator";
    case "SCHOOL_ADMIN":
      return "School Administrator";
    case "TEACHER":
      return "Teacher";
    case "ACCOUNTANT":
      return "Accountant";
    case "RECEPTIONIST":
      return "Receptionist";
    default:
      return role.replaceAll("_", " ");
  }
}

"use client";

import { FormEvent, useState } from "react";
import { Loader2, Plus, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CreateStaffAccountButton({ canCreateAdministrators }: { canCreateAdministrators: boolean }) {
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
        body: JSON.stringify({ fullName: form.get("fullName"), phone: form.get("phone"), preset }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to create account.");
      toast.success("Staff WhatsApp login created");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" /> Create staff user</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create staff user</DialogTitle>
            <DialogDescription>The user will sign in using a WhatsApp OTP sent to this mobile number.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-6">
            <div className="grid gap-2"><Label htmlFor="staff-name">Full name</Label><Input id="staff-name" name="fullName" required placeholder="Enter staff member name" /></div>
            <div className="grid gap-2"><Label htmlFor="staff-phone">Registered mobile number</Label><Input id="staff-phone" name="phone" inputMode="numeric" required placeholder="10-digit mobile number" /></div>
            <div className="grid gap-2"><Label>Position and access</Label><Select value={preset} onValueChange={setPreset}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              {canCreateAdministrators && <SelectItem value="SCHOOL_ADMIN">School Administrator</SelectItem>}
              {canCreateAdministrators && <SelectItem value="PRINCIPAL">Principal</SelectItem>}
              {canCreateAdministrators && <SelectItem value="VICE_PRINCIPAL">Vice Principal</SelectItem>}
              <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
              <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
            </SelectContent></Select></div>
            <p className="rounded-xl bg-muted p-3 text-xs leading-5 text-muted-foreground">Teachers are created from the Teachers page so their login stays linked to allocations, attendance, and homework.</p>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Create login</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StaffAccountStatusButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function toggle() {
    setPending(true);
    try {
      const response = await fetch(`/api/v1/staff-accounts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to update account.");
      toast.success(active ? "Account disabled" : "Account enabled");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update account.");
    } finally { setPending(false); }
  }
  return <Button size="sm" variant="outline" disabled={pending} onClick={toggle}><Power className="size-3.5" /> {active ? "Disable" : "Enable"}</Button>;
}

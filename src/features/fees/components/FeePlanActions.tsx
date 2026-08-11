"use client";

import { Check, Eye, Pencil, Play, X } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ActionMenu } from "@/components/common/actions/ActionMenu";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeeInstallmentsDialog } from "./FeeInstallmentsDialog";
import { FeePlanDialog } from "./FeePlanDialog";

type Props = {
  feePlanId: string;
  active: boolean;
  feePlanName: string;
};

export function FeePlanActions({ feePlanId, active, feePlanName }: Props) {
  const router = useRouter();
  const [installmentsOpen, setInstallmentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function changeStatus(nextActive: boolean) {
    const response = await fetch(`/api/v1/fee-plans/${feePlanId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        active: nextActive,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(nextActive ? "Fee plan activated." : "Fee plan deactivated.");

    router.refresh();
  }

  async function generateInstallments() {
    const response = await fetch(
      `/api/v1/fee-plans/${feePlanId}/installments/generate`,
      {
        method: "POST",
      },
    );

    const result = await response.json();

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    const results = result.data?.results ?? [];

    const generated = results.filter(
      (item: { status: string }) => item.status === "GENERATED",
    );

    const existing = results.filter(
      (item: { status: string }) => item.status === "EXISTS",
    );

    if (generated.length > 0) {
      toast.success("Fee installments generated successfully.");
    } else if (existing.length > 0) {
      toast.success("Fee installments already exist.");
    } else {
      toast.success("Fee installment generation completed.");
    }

    router.refresh();
  }

  return (
    <>
      <ActionMenu>
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>

        <DropdownMenuItem onClick={generateInstallments}>
          <Play className="mr-2 h-4 w-4" />
          Generate Installments
        </DropdownMenuItem>

        {active ? (
          <DropdownMenuItem onClick={() => changeStatus(false)}>
            <X className="mr-2 h-4 w-4" />
            Deactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => changeStatus(true)}>
            <Check className="mr-2 h-4 w-4" />
            Activate
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => setInstallmentsOpen(true)}>
          <Eye className="mr-2 h-4 w-4" />
          View Installments
        </DropdownMenuItem>
      </ActionMenu>

      <FeeInstallmentsDialog
        open={installmentsOpen}
        onOpenChange={setInstallmentsOpen}
        feePlanId={feePlanId}
        feePlanName={feePlanName}
      />

      <FeePlanDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        feePlanId={feePlanId}
      />
    </>
  );
}

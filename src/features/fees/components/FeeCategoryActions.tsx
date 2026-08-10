"use client";

import { useState } from "react";

import { Check, Pencil, X } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { ActionMenu } from "@/components/common/actions/ActionMenu";

import { FeeCategoryDialog } from "./FeeCategoryDialog";

import { toast } from "sonner";

import { useRouter } from "next/navigation";

type Props = {
  feeCategoryId: string;
  active: boolean;
};

export function FeeCategoryActions({ feeCategoryId, active }: Props) {
  const [open, setOpen] = useState(false);

  const router = useRouter();

  async function changeStatus(nextActive: boolean) {
    const response = await fetch(`/api/v1/fee-categories/${feeCategoryId}`, {
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

    toast.success(
      nextActive ? "Fee category activated." : "Fee category deactivated.",
    );

    router.refresh();
  }

  return (
    <>
      <ActionMenu>
        <DropdownMenuItem onClick={() => setOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
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
      </ActionMenu>

      <FeeCategoryDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        feeCategoryId={feeCategoryId}
      />
    </>
  );
}

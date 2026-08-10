import type { ColumnDef } from "@tanstack/react-table";
import { FeePlanActions } from "./components/FeePlanActions";

type FeePlan = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  appliesToAllClasses: boolean;

  academicYear?: {
    id: string;
    name: string;
  };

  classes?: {
    id: string;
    class?: {
      id: string;
      name: string;
    };
  }[];

  items?: {
    id: string;
    frequency: string;
    amount: string;
    mandatory: boolean;
    feeCategory?: {
      id: string;
      name: string;
    };
  }[];
};

export const feePlanColumns: ColumnDef<FeePlan>[] = [
  {
    accessorKey: "name",
    header: "Fee Plan",
  },
  {
    id: "academicYear",
    header: "Academic Year",
    cell: ({ row }) => row.original.academicYear?.name ?? "-",
  },
  {
    id: "classes",
    header: "Classes",
    cell: ({ row }) => {
      const plan = row.original;

      if (plan.appliesToAllClasses) {
        return "All Classes";
      }

      return (
        plan.classes
          ?.map((item) => item.class?.name)
          .filter(Boolean)
          .join(", ") || "-"
      );
    },
  },
  {
    id: "items",
    header: "Fee Items",
    cell: ({ row }) => {
      return row.original.items?.length ?? 0;
    },
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => (row.original.active ? "Active" : "Inactive"),
  },

  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <FeePlanActions
        feePlanId={row.original.id}
        active={row.original.active}
      />
    ),
  },
];

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Filter } from "lucide-react";
import { useMemo, useState } from "react";

import { CrudToolbar } from "@/components/common/crud";
import { DataGrid } from "@/components/datagrid/DataGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  CreateStaffAccountButton,
  EditStaffAccountButton,
  StaffAccountStatusButton,
} from "./StaffAccountActions";

export type StaffUserRow = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  role: string;
  designation: string;
  isActive: boolean;
  canManage: boolean;
  canEdit: boolean;
  isCurrentUser: boolean;
};

type RoleFilter =
  | "ALL"
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "ACCOUNTANT"
  | "RECEPTIONIST";

type StatusFilter = "ALL" | "ACTIVE" | "DISABLED";

const PAGE_SIZE = 10;

const ROLE_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: "ALL", label: "All Roles" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "SCHOOL_ADMIN", label: "School Admin" },
  { value: "TEACHER", label: "Teacher" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "RECEPTIONIST", label: "Receptionist" },
];

const staffColumns: ColumnDef<StaffUserRow>[] = [
  {
    accessorKey: "name",
    header: "Staff Member",
    cell: ({ row }) => {
      const account = row.original;
      const initials =
        account.name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase() || "U";

      return (
        <div className="flex min-w-56 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">
                {account.name}
              </span>
              {account.isCurrentUser ? (
                <Badge
                  variant="outline"
                  className="border-indigo-200 bg-indigo-50 text-[10px] font-bold text-indigo-700"
                >
                  You
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {account.designation || roleLabel(account.role)}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "phone",
    header: "Mobile",
    cell: ({ row }) => (
      <span className="font-medium text-muted-foreground">
        {row.original.phone || "Not registered"}
      </span>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge variant="outline" className={roleBadgeClass(row.original.role)}>
        {roleLabel(row.original.role)}
      </Badge>
    ),
  },
  {
    accessorKey: "designation",
    header: "Designation",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.designation || "—"}
      </span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Access",
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge className="border-0 bg-emerald-100 font-semibold text-emerald-700 hover:bg-emerald-100">
          Active
        </Badge>
      ) : (
        <Badge
          variant="secondary"
          className="bg-slate-100 font-semibold text-slate-600"
        >
          Disabled
        </Badge>
      ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const account = row.original;

      if (account.canManage) {
        return (
          <div className="flex items-center gap-2">
            {account.canEdit ? (
              <EditStaffAccountButton
                account={{
                  id: account.id,
                  name: account.name,
                  phone: account.phone,
                  role: account.role,
                  designation: account.designation,
                  isActive: account.isActive,
                }}
              />
            ) : null}
            <StaffAccountStatusButton
              id={account.id}
              active={account.isActive}
            />
          </div>
        );
      }

      return (
        <span className="text-xs font-medium text-muted-foreground">
          {account.isCurrentUser ? "Current account" : "Protected"}
        </span>
      );
    },
  },
];

export function StaffUsersDirectory({
  rows,
  canCreateAdministrators,
}: {
  rows: StaffUserRow[];
  canCreateAdministrators: boolean;
}) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((account) => {
      const matchesSearch =
        !query ||
        account.name.toLowerCase().includes(query) ||
        account.phone.toLowerCase().includes(query) ||
        account.designation.toLowerCase().includes(query) ||
        roleLabel(account.role).toLowerCase().includes(query);

      const matchesRole = role === "ALL" || account.role === role;
      const matchesStatus =
        status === "ALL" ||
        (status === "ACTIVE" && account.isActive) ||
        (status === "DISABLED" && !account.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [role, rows, search, status]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visibleRows = filteredRows.slice(start, start + PAGE_SIZE);
  const hasFilters =
    Boolean(search.trim()) || role !== "ALL" || status !== "ALL";

  function resetFilters() {
    setSearch("");
    setRole("ALL");
    setStatus("ALL");
    setPage(1);
  }

  return (
    <DataGrid
      columns={staffColumns}
      data={visibleRows}
      page={safePage}
      totalPages={totalPages}
      onPageChange={setPage}
      emptyTitle="No staff accounts found"
      emptyDescription={
        hasFilters
          ? "No staff accounts match the current search and filters."
          : "Create the first staff login to begin managing school access."
      }
      emptyAction={
        !hasFilters ? (
          <CreateStaffAccountButton
            canCreateAdministrators={canCreateAdministrators}
          />
        ) : undefined
      }
      toolbar={
        <CrudToolbar
          search={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search name, mobile or designation..."
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground lg:flex">
              <Filter className="size-3.5 text-primary" />
              Filter
            </div>

            <Select
              value={role}
              onValueChange={(value) => {
                setRole(value as RoleFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full min-w-40 rounded-xl border-border/70 bg-background/80 px-3 font-medium shadow-sm transition-all hover:border-primary/30 hover:bg-card focus:ring-primary/20 sm:w-44">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/70 bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl">
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="cursor-pointer rounded-lg py-2.5 font-medium"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full min-w-36 rounded-xl border-border/70 bg-background/80 px-3 font-medium shadow-sm transition-all hover:border-primary/30 hover:bg-card focus:ring-primary/20 sm:w-40">
                <SelectValue placeholder="Access status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/70 bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl">
                <SelectItem value="ALL">All Access</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-xl px-3 text-xs font-semibold text-muted-foreground"
                onClick={resetFilters}
              >
                Clear filters
              </Button>
            ) : null}

            <div className="hidden rounded-xl bg-muted/60 px-3 py-2.5 text-xs font-semibold text-muted-foreground xl:block">
              {filteredRows.length} of {rows.length}
            </div>
          </div>
        </CrudToolbar>
      }
    />
  );
}

function roleLabel(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "SCHOOL_ADMIN":
      return "School Admin";
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

function roleBadgeClass(role: string) {
  switch (role) {
    case "SUPER_ADMIN":
      return "border-violet-200 bg-violet-50 font-semibold text-violet-700";
    case "SCHOOL_ADMIN":
      return "border-indigo-200 bg-indigo-50 font-semibold text-indigo-700";
    case "TEACHER":
      return "border-blue-200 bg-blue-50 font-semibold text-blue-700";
    case "ACCOUNTANT":
      return "border-amber-200 bg-amber-50 font-semibold text-amber-700";
    case "RECEPTIONIST":
      return "border-slate-200 bg-slate-50 font-semibold text-slate-700";
    default:
      return "font-semibold";
  }
}

import {
  GraduationCap,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
  UsersRound,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { CreateStaffAccountButton } from "@/features/users/StaffAccountActions";
import {
  StaffUsersDirectory,
  type StaffUserRow,
} from "@/features/users/StaffUsersDirectory";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ schoolSlug: string }> };

export default async function StaffUsersPage({ params }: Props) {
  const { schoolSlug } = await params;
  const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);

  const accounts = await prisma.membership.findMany({
    where: {
      schoolId: actor.schoolId,
      role: {
        in: [
          "SUPER_ADMIN",
          "SCHOOL_ADMIN",
          "TEACHER",
          "ACCOUNTANT",
          "RECEPTIONIST",
        ],
      },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      role: true,
      designation: true,
      isActive: true,
      userId: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });

  const active = accounts.filter((account) => account.isActive).length;
  const administrators = accounts.filter((account) =>
    ["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(account.role),
  ).length;
  const teachers = accounts.filter(
    (account) => account.role === "TEACHER",
  ).length;
  const disabled = accounts.length - active;

  const rows: StaffUserRow[] = accounts.map((account) => {
    const name =
      [account.user.firstName, account.user.lastName]
        .filter(Boolean)
        .join(" ") || "SchoolDB user";

    const canManage =
      account.userId !== actor.userId &&
      account.role !== "SUPER_ADMIN" &&
      (actor.role === "SUPER_ADMIN" || account.role !== "SCHOOL_ADMIN");

    return {
      id: account.id,
      userId: account.userId,
      name,
      phone: account.user.phone || "",
      role: account.role,
      designation: account.designation || "",
      isActive: account.isActive,
      canManage,
      canEdit: actor.role === "SUPER_ADMIN" && canManage,
      isCurrentUser: account.userId === actor.userId,
    };
  });

  return (
    <div className="schooldb-page-enter space-y-6 pb-10">
      <PageHeader
        title="User Accounts"
        description="Create, search, filter, and control staff access to this school workspace."
        action={
          <CreateStaffAccountButton
            canCreateAdministrators={actor.role === "SUPER_ADMIN"}
          />
        }
      />

      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/60 px-6 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] md:px-8 md:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 top-1/2 size-40 -translate-y-1/2 rounded-full bg-indigo-400/5 blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-[0_10px_25px_rgba(79,70,229,0.20)] ring-1 ring-indigo-500/10">
              <UserCog className="size-6" strokeWidth={2} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3 text-indigo-500" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">
                  Access Management
                </p>
              </div>

              <h2 className="mt-2 text-xl font-bold tracking-[-0.025em] text-slate-950 md:text-2xl">
                Manage every staff login from one place
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Find users quickly, review their role and designation, and
                enable or disable access without leaving the directory.
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
            <SummaryPill
              icon={ShieldCheck}
              label="Active access"
              value={active + " enabled"}
            />
            <SummaryPill
              icon={UserCog}
              label="Disabled"
              value={disabled + " accounts"}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={UsersRound}
          label="Staff accounts"
          value={accounts.length}
          hint="All staff logins"
        />
        <Stat
          icon={ShieldCheck}
          label="Active access"
          value={active}
          hint="Can sign in now"
        />
        <Stat
          icon={UserCog}
          label="Administrators"
          value={administrators}
          hint="Admin-level accounts"
        />
        <Stat
          icon={GraduationCap}
          label="Teachers"
          value={teachers}
          hint="Teacher logins"
        />
      </section>

      <section className="premium-card overflow-hidden rounded-3xl bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200/70 bg-white px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Search className="size-4" strokeWidth={2} />
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">
                Staff Directory
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Search by name, mobile number, designation, or filter by role
                and access status.
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs font-medium text-slate-400 sm:flex">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]" />
            Access controls synchronized
          </div>
        </div>

        <div className="p-3 md:p-5">
          <StaffUsersDirectory
            rows={rows}
            canCreateAdministrators={actor.role === "SUPER_ADMIN"}
          />
        </div>
      </section>
    </div>
  );
}

function SummaryPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white/85 px-4 py-3 shadow-[0_10px_30px_rgba(79,70,229,0.06)] backdrop-blur-xl">
      <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
        <Icon className="size-4" strokeWidth={2} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
          <Icon className="size-5" strokeWidth={2} />
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Staff
        </span>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

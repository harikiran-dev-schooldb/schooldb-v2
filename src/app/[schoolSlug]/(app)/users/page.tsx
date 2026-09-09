import { ShieldCheck, UserCog, UsersRound } from "lucide-react";

import { PageContainer, PageHeader } from "@/components/common/layout";
import { Badge } from "@/components/ui/badge";
import { CreateStaffAccountButton, StaffAccountStatusButton } from "@/features/users/StaffAccountActions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ schoolSlug: string }> };

export default async function StaffUsersPage({ params }: Props) {
  const { schoolSlug } = await params;
  const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"], schoolSlug);
  const accounts = await prisma.membership.findMany({
    where: { schoolId: actor.schoolId, role: { in: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT", "RECEPTIONIST"] } },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: { id: true, role: true, designation: true, isActive: true, userId: true, user: { select: { firstName: true, lastName: true, phone: true } } },
  });
  const active = accounts.filter((account) => account.isActive).length;

  return <PageContainer>
    <PageHeader title="User Accounts" description="Create and control staff access to this school workspace." actions={<CreateStaffAccountButton canCreateAdministrators={actor.role === "SUPER_ADMIN"} />} />
    <section className="grid gap-4 sm:grid-cols-3">
      <Stat icon={UsersRound} label="Staff accounts" value={accounts.length} />
      <Stat icon={ShieldCheck} label="Active access" value={active} />
      <Stat icon={UserCog} label="Disabled" value={accounts.length - active} />
    </section>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="divide-y">{accounts.map((account) => {
        const name = [account.user.firstName, account.user.lastName].filter(Boolean).join(" ") || "SchoolDB user";
        const canManage = account.userId !== actor.userId && account.role !== "SUPER_ADMIN" && (actor.role === "SUPER_ADMIN" || account.role !== "SCHOOL_ADMIN");
        return <article key={account.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 font-bold text-indigo-700">{name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><h2 className="font-bold">{name}</h2><p className="mt-1 text-sm text-muted-foreground">{account.user.phone || "No mobile number"} · {account.designation || account.role.replaceAll("_", " ")}</p></div>
          <Badge variant={account.isActive ? "success" : "outline"}>{account.isActive ? "ACTIVE" : "DISABLED"}</Badge>
          {canManage && <StaffAccountStatusButton id={account.id} active={account.isActive} />}
        </article>;
      })}</div>
    </section>
  </PageContainer>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: number }) {
  return <div className="rounded-2xl border bg-card p-5 shadow-sm"><Icon className="size-5 text-indigo-600" /><p className="mt-3 text-3xl font-black">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>;
}

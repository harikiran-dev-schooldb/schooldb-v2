import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { syncUser } from "@/lib/sync-user";
import { getMembership, getSchoolBySlug } from "@/lib/tenant";
import { SchoolProvider } from "@/contexts/school-context";
import { AppShell } from "@/components/layout/AppShell";

export default async function SchoolAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ schoolSlug: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const { schoolSlug } = await params;

  const user = await syncUser();

  if (!user) {
    redirect("/login");
  }

  const school = await getSchoolBySlug(schoolSlug);

  if (!school) {
    notFound();
  }

  const membership = await getMembership(user.id, school.id);

  if (!membership) {
    redirect("/");
  }

  return (
    <SchoolProvider
      value={{
        school,
        membership,
        user,
        role: membership.role,
      }}
    >
      <AppShell>{children}</AppShell>
    </SchoolProvider>
  );
}

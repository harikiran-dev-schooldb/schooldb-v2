import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { syncUser } from "@/lib/sync-user";
import { getMembership, getSchoolBySlug } from "@/lib/tenant";
import { SchoolProvider } from "@/contexts/school-context";
import { AppShell } from "@/components/layout/AppShell";
import { isOperationalRole, isSelfServiceRole } from "@/lib/access-control";
import { isSchoolPathAllowed } from "@/lib/route-access";
import { currentTeacherAccess } from "@/lib/auth";
import { isTeacherRouteAllowed } from "@/lib/teacher-access";

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

  if (!isOperationalRole(membership.role)) {
    if (isSelfServiceRole(membership.role)) {
      redirect(`/${schoolSlug}/my`);
    }
    redirect("/");
  }

  const pathname = (await headers()).get("x-school-pathname");
  const teacherAccess = membership.role === "TEACHER"
    ? await currentTeacherAccess(school.id)
    : null;
  if (
    pathname &&
    (!isSchoolPathAllowed(school, pathname, schoolSlug, membership.role) ||
      (membership.role === "TEACHER" &&
        !isTeacherRouteAllowed(
          teacherAccess,
          pathname.slice(`/${schoolSlug}/`.length).replace(/\/+$/, ""),
        )))
  ) {
    notFound();
  }

  return (
    <SchoolProvider
      value={{
        school,
        membership,
        user,
        role: membership.role,
        teacherAccess,
      }}
    >
      <AppShell>{children}</AppShell>
    </SchoolProvider>
  );
}

"use client";

import Link from "next/link";
import { ClipboardPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSchool } from "@/contexts/school-context";
import { isMemberRouteAllowed } from "@/lib/navigation-access";
import { isRouteAllowed } from "@/lib/route-access";
import { followUpOriginParams, type FollowUpOrigin, type FollowUpSource } from "../follow-up-ui";

export function useCanCreateStudentFollowUp(source: FollowUpSource) {
  const { school, role, membership, teacherAccess } = useSchool();
  const teacherCanUseSource = source === "EXAM_FAILURE"
    ? teacherAccess?.resultAccess
    : teacherAccess?.attendanceAccess;
  const allowedRole = role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN" ||
    (role === "TEACHER" && teacherCanUseSource);
  return Boolean(allowedRole && isRouteAllowed(school, "student-follow-ups") &&
    isMemberRouteAllowed(membership, "student-follow-ups"));
}

export function StudentFollowUpLink({ schoolSlug, origin }: { schoolSlug: string; origin: FollowUpOrigin }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link
        href={`/${schoolSlug}/student-follow-ups?${followUpOriginParams(origin)}#create-follow-up`}
        prefetch={false}
      >
        <ClipboardPlus aria-hidden="true" className="size-4" />
        Create follow-up
      </Link>
    </Button>
  );
}

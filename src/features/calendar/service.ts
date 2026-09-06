import { audienceVisibility } from "@/features/audiences/types";
import { prisma } from "@/lib/prisma";
import { listAccessibleStudents } from "@/lib/student-access";

export async function listVisibleCalendarEvents(schoolSlug: string) {
  const { membership, students } = await listAccessibleStudents(schoolSlug);
  return prisma.schoolCalendarEvent.findMany({
    where: {
      schoolId: membership.schoolId,
      archived: false,
      OR: audienceVisibility(students),
    },
    orderBy: [{ startDate: "asc" }, { title: "asc" }],
    take: 500,
  });
}

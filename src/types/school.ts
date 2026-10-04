import { Membership, Role, School, User } from "@/generated/prisma/client";
import type { TeacherAccessSettings } from "@/lib/teacher-access";


export type SchoolContextType = {
  school: School;
  membership: Membership;
  user: User;
  role: Role;
  teacherAccess: TeacherAccessSettings | null;
};

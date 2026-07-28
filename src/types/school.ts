import { Membership, Role, School, User } from "@/generated/prisma/client";


export type SchoolContextType = {
  school: School;
  membership: Membership;
  user: User;
  role: Role;
};
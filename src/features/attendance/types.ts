import { Gender } from "@/generated/prisma/client";

export type TeacherListItem = {
  id: string;

  employeeId: string;

  fullName: string;

  gender: Gender;

  phone: string | null;

  email: string | null;

  designation: string | null;

  qualification: string | null;

  joiningDate: Date | null;

  active: boolean;
};

export type TeacherOption = {
  id: string;

  label: string;
};
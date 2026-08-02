import { Gender, StudentStatus } from "@/generated/prisma/browser";

export type StudentListItem = {
  id: string;
  admissionNo: string;
  fullName: string;
  gender: Gender;
  phone: string | null;
  status: StudentStatus;
};

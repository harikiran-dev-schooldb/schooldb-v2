export type StudentListItem = {
  id: string;
  admissionNo: string;
  fullName: string | null;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string | null;
  status:
    | "ACTIVE"
    | "INACTIVE"
    | "TRANSFERRED"
    | "DROPPED"
    | "ALUMNI";
};
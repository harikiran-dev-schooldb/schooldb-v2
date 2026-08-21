export type StudentListItem = {
  id: string;
  admissionNo: string;
  fullName: string | null;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string | null;
  fatherName: string | null;
  className: string | null;
  sectionName: string | null;
  status:
    | "ACTIVE"
    | "INACTIVE"
    | "TC_ISSUED"
    | "NOT_COMING"
    | "DROPPED"
    | "ALUMNI";
};

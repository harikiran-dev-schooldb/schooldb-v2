export type Student = {
  id: string;
  admissionNo: string;
  fullName: string | null;

  className: string | null;
  sectionName: string | null;
};

export type StudentResponse = {
  data: Student[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type Installment = {
  id: string;
  name: string;
  payableAmount: number;
  paidAmount: number;
  outstanding: number;
  status: "PAID" | "PENDING" | "PARTIAL";
};

export type FeeRow = {
  id: string;

  installmentName: string;

  dueDate: string;

  payableAmount: number;
  paidAmount: number;
  outstanding: number;

  status: "PAID" | "PENDING" | "PARTIAL";

  studentEnrollmentId: string;
};
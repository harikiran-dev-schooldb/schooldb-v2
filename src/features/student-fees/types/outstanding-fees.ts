export type OutstandingRow = {
  id: string;

  installmentName: string;
  dueDate: string;

  status: "PENDING" | "PARTIAL";

  amount: number;
  concession: number;
  payableAmount: number;
  paidAmount: number;
  outstanding: number;

  feeCategory: {
    id: string;
    name: string;
    code: string;
  };

  student: {
    id: string;
    admissionNo: string;
    fullName: string | null;
  };

  class: {
    id: string;
    name: string;
  };

  section: {
    id: string;
    name: string;
  };

  rollNo: number | null;

  studentFeeId: string;
  studentEnrollmentId: string;

  feePlan: {
    id: string;
    name: string;

    academicYear: {
      id: string;
      name: string;
    };
  };
};

export type OutstandingFeesPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type OutstandingFeesData = {
  rows: OutstandingRow[];

  summary: {
    installmentCount: number;
    totalPayable: number;
    totalConcession: number;
    totalPaid: number;
    outstanding: number;
  };

  pagination: OutstandingFeesPagination;
};
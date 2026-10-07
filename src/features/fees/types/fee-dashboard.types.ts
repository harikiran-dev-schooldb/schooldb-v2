export type FeeDashboardData = {
  summary: {
    totalAmount: number;
    totalRteWaiver: number;
    totalConcession: number;
    totalPayable: number;
    totalPaid: number;
    outstanding: number;
    pendingCount: number;
    partialCount: number;
    paidCount: number;
    waivedCount: number;
    installmentCount: number;
    collectionEfficiency: number;
  };

  collection: {
    today: number;
    todayPaymentCount: number;
    thisMonth: number;
    thisMonthPaymentCount: number;
    previousMonth: number;
    previousMonthPaymentCount: number;
    thisMonthExpenses: number;
    thisMonthExpenseCount: number;
    netCashFlow: number;
  };

  ageing: Record<
    "current" | "days31To60" | "days61To90" | "over90",
    { count: number; amount: number }
  >;

  paymentModes: Record<
    string,
    {
      count: number;
      amount: number;
    }
  >;

  recentPayments: Array<{
    id: string;
    receiptNo: string;
    paymentDate: string;
    amount: number | string;
    paymentMode: string;

    studentEnrollment: {
      student: {
        admissionNo: string;
        fullName: string | null;
      };

      class: {
        name: string;
      };

      section: {
        name: string;
      };
    };
  }>;
};

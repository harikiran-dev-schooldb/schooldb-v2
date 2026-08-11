import { StudentFeeLedger } from "@/features/student-fees/components/StudentFeeLedger";

type Props = {
  params: Promise<{
    schoolSlug: string;
    studentFeeId: string;
  }>;
};

export default async function StudentFeeLedgerPage({ params }: Props) {
  const { studentFeeId } = await params;

  return <StudentFeeLedger studentFeeId={studentFeeId} />;
}

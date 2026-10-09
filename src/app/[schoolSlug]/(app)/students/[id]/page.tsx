import { StudentProfile } from "@/features/students/components/profile/StudentProfile";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
};

export default async function StudentProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab } = await searchParams;

  return <StudentProfile studentId={id} initialTab={tab} />;
}

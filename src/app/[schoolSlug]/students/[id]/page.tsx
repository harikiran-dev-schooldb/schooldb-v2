import { StudentProfile } from "@/features/students/components/profile/StudentProfile";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentProfilePage({ params }: Props) {
  const { id } = await params;

  return <StudentProfile studentId={id} />;
}

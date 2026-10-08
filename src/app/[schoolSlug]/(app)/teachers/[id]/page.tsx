import { TeacherProfile } from "@/features/teachers/components/profile/TeacherProfile";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TeacherProfilePage({ params }: Props) {
  const { id } = await params;

  return <TeacherProfile teacherId={id} />;
}

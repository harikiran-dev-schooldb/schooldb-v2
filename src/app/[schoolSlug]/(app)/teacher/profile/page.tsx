import { TeacherProfile } from "@/features/teachers/components/profile/TeacherProfile";
import { requireRole } from "@/lib/auth";

type Props = { params: Promise<{ schoolSlug: string }> };

export default async function MyTeacherProfilePage({ params }: Props) {
  const { schoolSlug } = await params;
  await requireRole(["TEACHER"], schoolSlug);

  return <TeacherProfile self />;
}

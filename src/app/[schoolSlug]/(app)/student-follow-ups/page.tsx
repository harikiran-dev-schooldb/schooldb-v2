import { isFollowUpSource, type FollowUpOrigin } from "@/features/student-follow-ups/follow-up-ui";
import { StudentFollowUpsPage } from "@/features/student-follow-ups/components/StudentFollowUpsPage";

type Props = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ params, searchParams }: Props) {
  const [{ schoolSlug }, filters] = await Promise.all([params, searchParams]);
  const studentId = first(filters.studentId)?.trim();
  const source = first(filters.source);
  const origin: FollowUpOrigin | undefined = studentId && isFollowUpSource(source)
    ? {
        studentId,
        source,
        academicYearId: first(filters.academicYearId),
        examId: first(filters.examId),
      }
    : undefined;

  return <StudentFollowUpsPage schoolSlug={schoolSlug} origin={origin} />;
}

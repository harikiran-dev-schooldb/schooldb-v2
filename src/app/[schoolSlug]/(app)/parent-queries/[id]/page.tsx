import { redirect } from "next/navigation";

export default async function ParentQueryRedirect({
  params,
}: {
  params: Promise<{ schoolSlug: string; id: string }>;
}) {
  const { schoolSlug, id } = await params;
  redirect(`/${schoolSlug}/queries/${id}`);
}

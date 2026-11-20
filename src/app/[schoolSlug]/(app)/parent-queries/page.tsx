import { redirect } from "next/navigation";

export default async function ParentQueriesRedirect({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  redirect(`/${schoolSlug}/queries?source=PARENT_QR`);
}

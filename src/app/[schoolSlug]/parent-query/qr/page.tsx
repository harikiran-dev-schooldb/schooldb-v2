import { notFound } from "next/navigation";
import { ApiError } from "@/lib/errors";
import { parentSupportSchool } from "@/lib/parent-support";
import { ParentQueryQr } from "./parent-query-qr";

export const metadata = { robots: { index: false, follow: false } };

export default async function ParentQueryQrPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const school = await parentSupportSchool(schoolSlug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  return <ParentQueryQr schoolName={school.name} schoolSlug={schoolSlug} />;
}

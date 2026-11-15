import { permanentRedirect } from "next/navigation";

export default async function LegacyAcademicYear({ params }: { params: Promise<{ schoolSlug: string }> }) {
  permanentRedirect(`/${(await params).schoolSlug}/academic-year`);
}

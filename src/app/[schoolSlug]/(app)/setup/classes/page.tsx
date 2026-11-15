import { permanentRedirect } from "next/navigation";

export default async function LegacyClasses({ params }: { params: Promise<{ schoolSlug: string }> }) {
  permanentRedirect(`/${(await params).schoolSlug}/classes`);
}

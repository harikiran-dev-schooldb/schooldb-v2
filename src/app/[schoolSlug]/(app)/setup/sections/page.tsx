import { permanentRedirect } from "next/navigation";

export default async function LegacySections({ params }: { params: Promise<{ schoolSlug: string }> }) {
  permanentRedirect(`/${(await params).schoolSlug}/sections`);
}

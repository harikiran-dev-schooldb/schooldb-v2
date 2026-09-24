import { AndroidAppBuilder } from "@/features/android-builds/AndroidAppBuilder";
import { requireRole } from "@/lib/auth";

export default async function AndroidAppBuilderPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  await requireRole(["SUPER_ADMIN"], schoolSlug);
  return <AndroidAppBuilder />;
}

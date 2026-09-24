import {
  androidBuildArtifactName,
  getGithubArtifactDownload,
  type AndroidBuildConfiguration,
} from "@/lib/android-build";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  try {
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug") ?? undefined;
    await requireRole(["SUPER_ADMIN"], schoolSlug);
    const { id } = await params;
    const build = await prisma.androidAppBuild.findUnique({
      where: { id },
      select: {
        status: true,
        githubRunId: true,
        configuration: true,
      },
    });
    if (!build) throw new ApiError(404, "Android build not found.");
    if (build.status !== "COMPLETED" || !build.githubRunId) {
      throw new ApiError(409, "The APK is not ready yet.");
    }

    const configuration =
      build.configuration as unknown as AndroidBuildConfiguration;
    const location = await getGithubArtifactDownload(
      build.githubRunId,
      androidBuildArtifactName(configuration),
    );
    return Response.redirect(location, 302);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return Response.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to download the APK.",
      },
      { status },
    );
  }
}

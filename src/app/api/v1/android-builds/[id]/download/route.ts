import {
  androidBuildArtifactName,
  getGithubArtifactDownload,
  legacyAndroidBuildArtifactName,
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
    const searchParams = new URL(request.url).searchParams;
    const schoolSlug = searchParams.get("schoolSlug") ?? undefined;
    const format = searchParams.get("format") === "aab" ? "aab" : "apk";
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
      throw new ApiError(409, "The Android package is not ready yet.");
    }

    const configuration =
      build.configuration as unknown as AndroidBuildConfiguration;
    const artifactNames =
      format === "aab"
        ? [androidBuildArtifactName(configuration, "aab")]
        : [
            androidBuildArtifactName(configuration, "apk"),
            legacyAndroidBuildArtifactName(configuration),
          ];
    const location = await getGithubArtifactDownload(
      build.githubRunId,
      artifactNames,
    );
    return Response.redirect(location, 302);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return Response.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to download the Android package.",
      },
      { status },
    );
  }
}

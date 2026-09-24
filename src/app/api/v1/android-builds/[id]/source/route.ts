import type { Prisma } from "@/generated/prisma/client";
import {
  bearerToken,
  verifyAndroidBuildToken,
  type AndroidBuildConfiguration,
} from "@/lib/android-build";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const build = await prisma.androidAppBuild.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        callbackTokenHash: true,
        configuration: true,
        logoBytes: true,
        firebaseConfig: true,
      },
    });
    if (!build) throw new ApiError(404, "Android build not found.");
    if (!verifyAndroidBuildToken(bearerToken(request), build.callbackTokenHash)) {
      throw new ApiError(401, "Invalid build token.");
    }
    if (!build.logoBytes || !build.firebaseConfig) {
      throw new ApiError(410, "Android build inputs are no longer available.");
    }

    const runId = new URL(request.url).searchParams.get("runId");

    if (build.status === "QUEUED") {
      await prisma.androidAppBuild.update({
        where: { id },
        data: {
          status: "BUILDING",
          message: "Preparing the school Android application.",
          startedAt: new Date(),
          githubRunId: runId || undefined,
        },
      });
    } else if (runId) {
      await prisma.androidAppBuild.update({
        where: { id },
        data: { githubRunId: runId },
      });
    }

    return Response.json(
      {
        success: true,
        data: {
          configuration:
            build.configuration as unknown as AndroidBuildConfiguration,
          logoBase64: Buffer.from(build.logoBytes).toString("base64"),
          firebaseBase64: Buffer.from(
            JSON.stringify(build.firebaseConfig as Prisma.JsonValue),
            "utf8",
          ).toString("base64"),
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return Response.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to load build inputs.",
      },
      { status },
    );
  }
}

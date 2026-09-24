import { Prisma } from "@/generated/prisma/client";
import {
  bearerToken,
  createAndroidBuildCallbackToken,
  hashAndroidBuildToken,
  verifyAndroidBuildToken,
} from "@/lib/android-build";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const build = await prisma.androidAppBuild.findUnique({
      where: { id },
      select: { id: true, callbackTokenHash: true, status: true },
    });
    if (!build) throw new ApiError(404, "Android build not found.");
    if (!verifyAndroidBuildToken(bearerToken(request), build.callbackTokenHash)) {
      throw new ApiError(401, "Invalid build token.");
    }

    const body = (await request.json()) as {
      status?: unknown;
      message?: unknown;
      runId?: unknown;
    };
    const completed = body.status === "COMPLETED";
    const status = completed ? "COMPLETED" : "FAILED";
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim().slice(0, 1000)
        : completed
          ? "Signed release APK and Play Store AAB are ready."
          : "The Android build failed.";
    const runId =
      typeof body.runId === "string" || typeof body.runId === "number"
        ? String(body.runId)
        : null;

    await prisma.androidAppBuild.update({
      where: { id },
      data: {
        status,
        message,
        githubRunId: runId,
        completedAt: new Date(),
        logoBytes: null,
        firebaseConfig: Prisma.DbNull,
        callbackTokenHash: hashAndroidBuildToken(
          createAndroidBuildCallbackToken(),
        ),
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return Response.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to update build status.",
      },
      { status },
    );
  }
}

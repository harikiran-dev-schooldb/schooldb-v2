import { Prisma } from "@/generated/prisma/client";
import {
  createAndroidBuildCallbackToken,
  hashAndroidBuildToken,
  parseAndroidBuildConfiguration,
  publicAppUrl,
  readAndroidLogo,
  readFirebaseConfiguration,
  triggerGithubAndroidBuild,
  type AndroidBuildConfiguration,
} from "@/lib/android-build";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export const runtime = "nodejs";

function buildSummary(build: {
  id: string;
  status: string;
  message: string | null;
  githubRunId: string | null;
  configuration: Prisma.JsonValue;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  school: { id: string; name: string; slug: string };
}) {
  const configuration =
    build.configuration as unknown as AndroidBuildConfiguration;
  const repository =
    process.env.GITHUB_ANDROID_REPOSITORY?.trim() ||
    "harikiran-dev-schooldb/schooldb-v2";

  return {
    id: build.id,
    status: build.status,
    message: build.message,
    githubRunId: build.githubRunId,
    githubRunUrl: build.githubRunId
      ? "https://github.com/" + repository + "/actions/runs/" + build.githubRunId
      : null,
    createdAt: build.createdAt,
    startedAt: build.startedAt,
    completedAt: build.completedAt,
    school: build.school,
    configuration: {
      flavorId: configuration.flavorId,
      applicationId: configuration.applicationId,
      appName: configuration.appName,
    },
  };
}

export async function GET(request: Request) {
  return apiHandler(async () => {
    await requireRole(["SUPER_ADMIN"]);
    const schoolId = new URL(request.url).searchParams.get("schoolId")?.trim();

    const builds = await prisma.androidAppBuild.findMany({
      where: schoolId ? { schoolId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        school: { select: { id: true, name: true, slug: true } },
      },
    });

    return ApiResponse.success({
      builds: builds.map(buildSummary),
      configured: Boolean(process.env.GITHUB_ACTIONS_TOKEN),
    });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN"]);
    const form = await request.formData();
    const schoolId =
      typeof form.get("schoolId") === "string"
        ? String(form.get("schoolId")).trim()
        : "";
    if (!schoolId) throw new ApiError(400, "Choose a school.");

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, slug: true },
    });
    if (!school) throw new ApiError(404, "School not found.");

    const activeBuild = await prisma.androidAppBuild.findFirst({
      where: {
        schoolId,
        status: { in: ["QUEUED", "BUILDING"] },
      },
      select: { id: true },
    });
    if (activeBuild) {
      throw new ApiError(409, "An Android build is already running for this school.");
    }

    const configuration = parseAndroidBuildConfiguration(form);
    if (configuration.schoolSlug !== school.slug) {
      throw new ApiError(400, "The Android school URL must match the selected school.");
    }
    const logoBytes = await readAndroidLogo(form.get("logo"));
    const firebaseConfig = await readFirebaseConfiguration(
      form.get("firebaseConfig"),
      configuration.applicationId,
    );
    const callbackToken = createAndroidBuildCallbackToken();

    const build = await prisma.androidAppBuild.create({
      data: {
        schoolId: school.id,
        requestedById: membership.userId,
        status: "QUEUED",
        configuration: configuration as unknown as Prisma.InputJsonValue,
        logoBytes,
        firebaseConfig: firebaseConfig as Prisma.InputJsonValue,
        callbackTokenHash: hashAndroidBuildToken(callbackToken),
        message: "Waiting for GitHub Actions.",
      },
      include: {
        school: { select: { id: true, name: true, slug: true } },
      },
    });

    const baseUrl = publicAppUrl(request);
    try {
      await triggerGithubAndroidBuild({
        buildId: build.id,
        callbackToken,
        schoolSlug: school.slug,
        sourceUrl: baseUrl + "/api/v1/android-builds/" + build.id + "/source",
        callbackUrl: baseUrl + "/api/v1/android-builds/" + build.id + "/callback",
      });
    } catch (error) {
      await prisma.androidAppBuild.update({
        where: { id: build.id },
        data: {
          status: "FAILED",
          message:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : "GitHub could not start the build.",
          completedAt: new Date(),
          logoBytes: null,
          firebaseConfig: Prisma.DbNull,
          callbackTokenHash: hashAndroidBuildToken(
            createAndroidBuildCallbackToken(),
          ),
        },
      });
      throw error;
    }

    return ApiResponse.success(
      { build: buildSummary(build) },
      "Android build started.",
      201,
    );
  });
}

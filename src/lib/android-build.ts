import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { ApiError } from "@/lib/errors";

export const MAX_ANDROID_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_FIREBASE_CONFIG_BYTES = 64 * 1024;

export type AndroidBuildConfiguration = {
  flavorId: string;
  applicationId: string;
  schoolSlug: string;
  schoolName: string;
  shortName: string;
  location: string;
  supportLabel: string;
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  dangerColor: string;
};

type GithubSettings = {
  repository: string;
  workflow: string;
  ref: string;
  token: string;
};

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ApiError(
      503,
      name + " is required before Android builds can be started.",
    );
  }
  return value;
}

export function getGithubAndroidBuildSettings(): GithubSettings {
  return {
    repository:
      process.env.GITHUB_ANDROID_REPOSITORY?.trim() ||
      "harikiran-dev-schooldb/schooldb-v2",
    workflow:
      process.env.GITHUB_ANDROID_BUILD_WORKFLOW?.trim() ||
      "android-school-build.yml",
    ref: process.env.GITHUB_ANDROID_BUILD_REF?.trim() || "main",
    token: requiredEnvironment("GITHUB_ACTIONS_TOKEN"),
  };
}

export function normalizeFlavorId(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^[^a-z]+/, "");
  return normalized || "school";
}

export function defaultAndroidApplicationId(slug: string) {
  return "com.schooldb.support." + normalizeFlavorId(slug);
}

function requiredText(value: FormDataEntryValue | null, label: string, max = 120) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new ApiError(400, label + " is required.");
  if (text.length > max) {
    throw new ApiError(400, label + " cannot exceed " + max + " characters.");
  }
  return text;
}

function color(value: FormDataEntryValue | null, label: string) {
  const text = requiredText(value, label, 7).toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(text)) {
    throw new ApiError(400, label + " must be a six-digit color.");
  }
  return "0xFF" + text.slice(1);
}

export function parseAndroidBuildConfiguration(form: FormData): AndroidBuildConfiguration {
  const schoolSlug = requiredText(form.get("schoolSlug"), "School URL", 80)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  const flavorId = normalizeFlavorId(
    typeof form.get("flavorId") === "string"
      ? String(form.get("flavorId"))
      : schoolSlug,
  );
  const applicationId = requiredText(
    form.get("applicationId"),
    "Application ID",
    160,
  ).toLowerCase();

  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(applicationId)) {
    throw new ApiError(
      400,
      "Application ID must look like com.schooldb.support.schoolname.",
    );
  }

  return {
    flavorId,
    applicationId,
    schoolSlug,
    schoolName: requiredText(form.get("schoolName"), "School name"),
    shortName: requiredText(form.get("shortName"), "Short name"),
    location:
      typeof form.get("location") === "string"
        ? String(form.get("location")).trim().slice(0, 120)
        : "",
    supportLabel: requiredText(form.get("supportLabel"), "Support label"),
    appName: requiredText(form.get("appName"), "App name"),
    primaryColor: color(form.get("primaryColor"), "Primary color"),
    secondaryColor: color(form.get("secondaryColor"), "Secondary color"),
    accentColor: color(form.get("accentColor"), "Accent color"),
    dangerColor: color(form.get("dangerColor"), "Danger color"),
  };
}

export async function readAndroidLogo(value: FormDataEntryValue | null) {
  if (!(value instanceof File)) {
    throw new ApiError(400, "Upload the school logo as a PNG file.");
  }
  if (value.type !== "image/png") {
    throw new ApiError(400, "The school logo must be a PNG file.");
  }
  if (value.size <= 0 || value.size > MAX_ANDROID_LOGO_BYTES) {
    throw new ApiError(400, "The school logo must be smaller than 2 MB.");
  }
  return new Uint8Array(await value.arrayBuffer());
}

export async function readFirebaseConfiguration(
  value: FormDataEntryValue | null,
  applicationId: string,
) {
  if (!(value instanceof File)) {
    throw new ApiError(400, "Upload the school's google-services.json file.");
  }
  if (value.size <= 0 || value.size > MAX_FIREBASE_CONFIG_BYTES) {
    throw new ApiError(400, "google-services.json must be smaller than 64 KB.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await value.text());
  } catch {
    throw new ApiError(400, "google-services.json is not valid JSON.");
  }

  const clients =
    parsed && typeof parsed === "object" && Array.isArray((parsed as { client?: unknown }).client)
      ? (parsed as { client: Array<Record<string, unknown>> }).client
      : [];

  const packageNames = clients
    .map((client) => {
      const info = client.client_info as
        | { android_client_info?: { package_name?: unknown } }
        | undefined;
      return typeof info?.android_client_info?.package_name === "string"
        ? info.android_client_info.package_name
        : null;
    })
    .filter((item): item is string => Boolean(item));

  if (!packageNames.includes(applicationId)) {
    throw new ApiError(
      400,
      "Firebase does not contain an Android client for " + applicationId + ".",
    );
  }

  return parsed as Record<string, unknown>;
}

export function createAndroidBuildCallbackToken() {
  return randomBytes(32).toString("hex");
}

export function hashAndroidBuildToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyAndroidBuildToken(token: string, expectedHash: string) {
  const actual = Buffer.from(hashAndroidBuildToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export function publicAppUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const origin = configured || new URL(request.url).origin;
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)) {
    throw new ApiError(
      503,
      "Set NEXT_PUBLIC_BASE_URL to a public HTTPS address before starting a cloud build.",
    );
  }
  return origin.replace(/\/+$/, "");
}

export async function triggerGithubAndroidBuild(input: {
  buildId: string;
  callbackToken: string;
  schoolSlug: string;
  sourceUrl: string;
  callbackUrl: string;
}) {
  const settings = getGithubAndroidBuildSettings();
  const response = await fetch(
    "https://api.github.com/repos/" +
      settings.repository +
      "/actions/workflows/" +
      settings.workflow +
      "/dispatches",
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + settings.token,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        ref: settings.ref,
        inputs: {
          build_id: input.buildId,
          callback_token: input.callbackToken,
          school_slug: input.schoolSlug,
          source_url: input.sourceUrl,
          callback_url: input.callbackUrl,
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new ApiError(
      502,
      "GitHub could not start the Android build (" +
        response.status +
        "). " +
        detail,
    );
  }
}

export async function getGithubArtifactDownload(runId: string, artifactName: string) {
  const settings = getGithubAndroidBuildSettings();
  const response = await fetch(
    "https://api.github.com/repos/" +
      settings.repository +
      "/actions/runs/" +
      runId +
      "/artifacts",
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + settings.token,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new ApiError(502, "GitHub build artifacts are unavailable.");
  }

  const payload = (await response.json()) as {
    artifacts?: Array<{
      name?: string;
      expired?: boolean;
      archive_download_url?: string;
    }>;
  };
  const artifact = payload.artifacts?.find(
    (item) => item.name === artifactName && !item.expired,
  );
  if (!artifact?.archive_download_url) {
    throw new ApiError(404, "The APK artifact was not found or has expired.");
  }

  const download = await fetch(artifact.archive_download_url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + settings.token,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    redirect: "manual",
    cache: "no-store",
  });
  const location = download.headers.get("location");
  if (!location) {
    throw new ApiError(502, "GitHub did not provide an APK download link.");
  }
  return location;
}

export function androidBuildArtifactName(configuration: AndroidBuildConfiguration) {
  return "school-support-" + configuration.flavorId;
}

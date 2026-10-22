import { performance } from "node:perf_hooks";

const PROFILE_TARGETS = {
  health: [["health", "/api/health", 1]],
  "admin-mobile": [
    ["mobile-context", "/api/v1/mobile/context?access=v1", 1],
    ["admin-dashboard", "/api/v1/mobile/admin/dashboard", 4],
    ["admin-notifications", "/api/v1/mobile/admin/notifications", 2],
    ["support-tickets", "/api/v1/support/tickets?filter=ALL&page=1&pageSize=25", 2],
  ],
  "teacher-mobile": [
    ["mobile-context", "/api/v1/mobile/context?access=v1", 1],
    ["teacher-dashboard", "/api/v1/mobile/teacher/dashboard", 4],
    ["teacher-notices", "/api/v1/mobile/teacher/notices", 2],
    ["teacher-homework", "/api/v1/mobile/teacher/homework", 2],
    ["teacher-profile", "/api/v1/mobile/teacher/profile", 1],
  ],
  "family-mobile": [
    ["mobile-context", "/api/v1/mobile/context?access=v1", 1],
    ["family-dashboard", "/api/v1/mobile/family/dashboard", 5],
    ["family-notifications", "/api/v1/mobile/family/notifications", 2],
  ],
  "support-mobile": [
    ["mobile-context", "/api/v1/mobile/context?access=v1", 1],
    ["support-tickets", "/api/v1/support/tickets?filter=ALL&page=1&pageSize=25", 5],
    ["support-students", "/api/v1/support/students?q=", 2],
    ["support-staff", "/api/v1/support/staff", 2],
  ],
};

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function enabled(value) {
  return value?.trim().toLowerCase() === "true";
}

function percentile(values, percentileValue) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentileValue / 100) * sorted.length) - 1,
  );
  return sorted[index];
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function targetName(url, index) {
  const parsed = new URL(url);
  return `${index + 1}:${parsed.pathname}${parsed.search}`;
}

function buildTargets(profile, baseUrl) {
  const explicitTargets = (process.env.LOAD_TEST_URLS || process.env.LOAD_TEST_URL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (explicitTargets.length > 0) {
    return explicitTargets.map((url, index) => ({
      name: targetName(url, index),
      url: new URL(url).toString(),
    }));
  }

  const profileTargets = PROFILE_TARGETS[profile];
  if (!profileTargets) {
    throw new Error(
      `Unknown LOAD_TEST_PROFILE=${profile}. Choose: ${Object.keys(PROFILE_TARGETS).join(", ")}`,
    );
  }

  return profileTargets.flatMap(([name, path, weight]) =>
    Array.from({ length: weight }, () => ({
      name,
      url: new URL(path, baseUrl).toString(),
    })),
  );
}

const profile = process.env.LOAD_TEST_PROFILE?.trim() || "health";
const baseUrl = new URL(process.env.LOAD_TEST_BASE_URL || "http://localhost:3000");
const targets = buildTargets(profile, baseUrl);
const uniqueTargets = [...new Map(targets.map((target) => [target.url, target])).values()];
const concurrency = Math.floor(positiveNumber(process.env.LOAD_TEST_CONCURRENCY, 25));
const durationSeconds = positiveNumber(process.env.LOAD_TEST_DURATION_SECONDS, 15);
const maxErrorRate = nonNegativeNumber(process.env.LOAD_TEST_MAX_ERROR_RATE, 1);
const maxP95Ms = positiveNumber(process.env.LOAD_TEST_MAX_P95_MS, 1_000);
const requestTimeoutMs = positiveNumber(process.env.LOAD_TEST_REQUEST_TIMEOUT_MS, 15_000);
const thinkTimeMs = nonNegativeNumber(
  process.env.LOAD_TEST_THINK_TIME_MS,
  profile === "health" ? 0 : 250,
);
const schoolSlug = process.env.LOAD_TEST_SCHOOL_SLUG?.trim();
const cookie = process.env.LOAD_TEST_COOKIE?.trim();
const authToken = process.env.LOAD_TEST_AUTH_TOKEN?.trim();
const dryRun = process.argv.includes("--dry-run") || enabled(process.env.LOAD_TEST_DRY_RUN);

if (targets.length === 0) throw new Error("Configure at least one load-test URL.");
if (!dryRun && profile !== "health" && !process.env.LOAD_TEST_URLS && !process.env.LOAD_TEST_URL) {
  if (!schoolSlug) throw new Error("LOAD_TEST_SCHOOL_SLUG is required for authenticated profiles.");
  if (!cookie && !authToken) {
    throw new Error("Set LOAD_TEST_COOKIE or LOAD_TEST_AUTH_TOKEN for authenticated profiles.");
  }
}

const productionTargets = uniqueTargets.filter(({ url }) => {
  const hostname = new URL(url).hostname.toLowerCase();
  return hostname === "schooldb.co.in" || hostname.endsWith(".schooldb.co.in");
});
if (!dryRun && productionTargets.length > 0 && !enabled(process.env.LOAD_TEST_ALLOW_PRODUCTION)) {
  throw new Error(
    "Production load testing is locked. Use a staging URL, or explicitly set LOAD_TEST_ALLOW_PRODUCTION=true.",
  );
}

const requestHeaders = {
  Accept: "application/json",
  "User-Agent": "schooldb-load-test/2.0",
  ...(schoolSlug ? { "x-school-slug": schoolSlug } : {}),
  ...(cookie ? { Cookie: cookie } : {}),
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
};

console.log(`Profile: ${profile}`);
console.log(`Base URL: ${baseUrl.origin}`);
console.log(`Authentication: ${authToken ? "bearer token" : cookie ? "cookie" : "none"}`);
console.log("Read-only targets:");
for (const target of uniqueTargets) console.log(`  - ${target.name}: ${target.url}`);

if (dryRun) {
  console.log("Dry run complete; no requests were sent.");
  process.exit(0);
}

async function request(target) {
  const startedAt = performance.now();
  try {
    const response = await fetch(target.url, {
      method: "GET",
      headers: requestHeaders,
      redirect: "follow",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    await response.arrayBuffer();
    return {
      durationMs: performance.now() - startedAt,
      ok: response.ok,
      status: response.status,
      error: null,
    };
  } catch (error) {
    return {
      durationMs: performance.now() - startedAt,
      ok: false,
      status: null,
      error: error instanceof Error ? error.name : "FetchError",
    };
  }
}

console.log("Running one preflight request per target...");
for (const target of uniqueTargets) {
  const result = await request(target);
  if (!result.ok) {
    throw new Error(
      `Preflight failed for ${target.name}: ${result.status ?? result.error}. Check the staging URL, role, school slug, and credentials.`,
    );
  }
}

const deadline = performance.now() + durationSeconds * 1_000;
const latencies = [];
const statuses = new Map();
const exceptions = new Map();
const targetResults = new Map(
  uniqueTargets.map((target) => [target.url, {
    name: target.name,
    requests: 0,
    errors: 0,
    latencies: [],
    statuses: new Map(),
  }]),
);
let errors = 0;
let requestSequence = 0;

async function worker() {
  while (performance.now() < deadline) {
    const target = targets[requestSequence++ % targets.length];
    const targetResult = targetResults.get(target.url);
    const result = await request(target);

    latencies.push(result.durationMs);
    targetResult.latencies.push(result.durationMs);
    targetResult.requests += 1;

    if (result.status !== null) {
      statuses.set(result.status, (statuses.get(result.status) || 0) + 1);
      targetResult.statuses.set(
        result.status,
        (targetResult.statuses.get(result.status) || 0) + 1,
      );
    }
    if (result.error) {
      exceptions.set(result.error, (exceptions.get(result.error) || 0) + 1);
    }
    if (!result.ok) {
      errors += 1;
      targetResult.errors += 1;
    }

    if (thinkTimeMs > 0 && performance.now() < deadline) await sleep(thinkTimeMs);
  }
}

console.log(
  `Testing with ${concurrency} concurrent clients for ${durationSeconds}s ` +
  `(think time ${thinkTimeMs}ms, timeout ${requestTimeoutMs}ms)`,
);
const testStartedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const elapsedSeconds = (performance.now() - testStartedAt) / 1_000;

const requests = latencies.length;
const errorRate = requests === 0 ? 100 : (errors / requests) * 100;
const p50 = percentile(latencies, 50);
const p95 = percentile(latencies, 95);
const p99 = percentile(latencies, 99);

console.table({
  requests,
  requestsPerSecond: Number((requests / elapsedSeconds).toFixed(1)),
  errorRatePercent: Number(errorRate.toFixed(2)),
  p50Ms: Number(p50.toFixed(1)),
  p95Ms: Number(p95.toFixed(1)),
  p99Ms: Number(p99.toFixed(1)),
  statuses: Object.fromEntries([...statuses.entries()].sort(([a], [b]) => a - b)),
  exceptions: Object.fromEntries(exceptions),
});

console.table(
  Object.fromEntries(
    [...targetResults.values()].map((result) => [result.name, {
      requests: result.requests,
      errors: result.errors,
      errorRatePercent: Number(
        (result.requests === 0 ? 100 : (result.errors / result.requests) * 100).toFixed(2),
      ),
      p50Ms: Number(percentile(result.latencies, 50).toFixed(1)),
      p95Ms: Number(percentile(result.latencies, 95).toFixed(1)),
      p99Ms: Number(percentile(result.latencies, 99).toFixed(1)),
      statuses: Object.fromEntries([...result.statuses.entries()].sort(([a], [b]) => a - b)),
    }]),
  ),
);

if (errorRate > maxErrorRate || p95 > maxP95Ms) {
  console.error(
    `Load test failed thresholds: errors <= ${maxErrorRate}% and p95 <= ${maxP95Ms}ms`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Load test passed thresholds: errors <= ${maxErrorRate}% and p95 <= ${maxP95Ms}ms`,
  );
}

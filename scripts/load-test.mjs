import { performance } from "node:perf_hooks";

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const targets = (process.env.LOAD_TEST_URLS || process.env.LOAD_TEST_URL || "http://localhost:3000/api/health")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (targets.length === 0) throw new Error("Configure at least one load-test URL.");
const concurrency = Math.floor(positiveNumber(process.env.LOAD_TEST_CONCURRENCY, 25));
const durationSeconds = positiveNumber(process.env.LOAD_TEST_DURATION_SECONDS, 15);
const maxErrorRate = positiveNumber(process.env.LOAD_TEST_MAX_ERROR_RATE, 1);
const maxP95Ms = positiveNumber(process.env.LOAD_TEST_MAX_P95_MS, 1_000);
const deadline = performance.now() + durationSeconds * 1_000;
const latencies = [];
const statuses = new Map();
const targetResults = new Map(targets.map((target) => [target, { requests: 0, errors: 0 }]));
let errors = 0;
let requestSequence = 0;

const requestHeaders = {
  "User-Agent": "schooldb-load-test/1.0",
  ...(process.env.LOAD_TEST_SCHOOL_SLUG
    ? { "x-school-slug": process.env.LOAD_TEST_SCHOOL_SLUG }
    : {}),
  ...(process.env.LOAD_TEST_COOKIE ? { Cookie: process.env.LOAD_TEST_COOKIE } : {}),
};

async function worker() {
  while (performance.now() < deadline) {
    const target = targets[requestSequence++ % targets.length];
    const targetResult = targetResults.get(target);
    const startedAt = performance.now();
    try {
      const response = await fetch(target, {
        headers: requestHeaders,
      });
      await response.arrayBuffer();
      latencies.push(performance.now() - startedAt);
      statuses.set(response.status, (statuses.get(response.status) || 0) + 1);
      targetResult.requests += 1;
      if (!response.ok) {
        errors += 1;
        targetResult.errors += 1;
      }
    } catch {
      latencies.push(performance.now() - startedAt);
      errors += 1;
      targetResult.requests += 1;
      targetResult.errors += 1;
    }
  }
}

function percentile(values, percentileValue) {
  if (values.length === 0) return 0;
  const index = Math.min(
    values.length - 1,
    Math.ceil((percentileValue / 100) * values.length) - 1,
  );
  return values[index];
}

console.log(`Testing ${targets.length} target(s) with ${concurrency} concurrent clients for ${durationSeconds}s`);
const testStartedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const elapsedSeconds = (performance.now() - testStartedAt) / 1_000;
latencies.sort((a, b) => a - b);

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
});
console.table(Object.fromEntries(targetResults));

if (errorRate > maxErrorRate || p95 > maxP95Ms) {
  console.error(
    `Load test failed thresholds: errors <= ${maxErrorRate}% and p95 <= ${maxP95Ms}ms`,
  );
  process.exitCode = 1;
}

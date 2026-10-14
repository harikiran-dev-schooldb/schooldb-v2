import assert from "node:assert/strict";
import test from "node:test";

import { createAsyncTtlCache } from "../src/lib/async-ttl-cache.ts";

test("reuses a cached value until its TTL expires", async () => {
  const cache = createAsyncTtlCache<number>({ ttlMs: 10_000 });
  let loads = 0;
  const load = async () => ++loads;

  assert.equal(await cache.get("school-1", load), 1);
  assert.equal(await cache.get("school-1", load), 1);
  assert.equal(loads, 1);
});

test("deduplicates concurrent loads for the same tenant key", async () => {
  const cache = createAsyncTtlCache<number>({ ttlMs: 10_000 });
  let resolveLoad: (value: number) => void = () => undefined;
  let loads = 0;
  const load = () => {
    loads += 1;
    return new Promise<number>((resolve) => {
      resolveLoad = resolve;
    });
  };

  const first = cache.get("school-1", load);
  const second = cache.get("school-1", load);
  resolveLoad(42);

  assert.deepEqual(await Promise.all([first, second]), [42, 42]);
  assert.equal(loads, 1);
});

test("force refresh replaces a cached value", async () => {
  const cache = createAsyncTtlCache<number>({ ttlMs: 10_000 });
  let loads = 0;
  const load = async () => ++loads;

  assert.equal(await cache.get("school-1", load), 1);
  assert.equal(await cache.get("school-1", load, { force: true }), 2);
  assert.equal(await cache.get("school-1", load), 2);
});

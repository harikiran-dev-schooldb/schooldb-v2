import assert from "node:assert/strict";
import test from "node:test";

import { safeDatabaseError } from "../src/lib/database-error.ts";

test("maps expected Prisma failures to clear client responses", () => {
  const cases = [
    ["P2000", 400, /too long/i],
    ["P2002", 409, /same unique details/i],
    ["P2003", 409, /related record/i],
    ["P2011", 400, /missing or invalid/i],
    ["P2024", 503, /database is busy/i],
    ["P2025", 404, /not found/i],
    ["P2034", 409, /changed during the request/i],
  ] as const;

  for (const [code, status, message] of cases) {
    const mapped = safeDatabaseError(
      Object.assign(new Error("raw database error"), { code }),
    );
    assert.ok(mapped);
    assert.equal(mapped.status, status);
    assert.match(mapped.message, message);
    assert.doesNotMatch(mapped.message, /raw database error/i);
  }
});

test("leaves unknown failures for the private server-error fallback", () => {
  assert.equal(
    safeDatabaseError(
      Object.assign(new Error("sensitive query detail"), { code: "P2999" }),
    ),
    null,
  );
});

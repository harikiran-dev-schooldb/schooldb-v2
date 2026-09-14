import assert from "node:assert/strict";
import test from "node:test";

import { normalizePostgresConnectionString } from "../src/lib/postgres-connection-string.ts";

test("keeps the current strict TLS behavior without the pg deprecation warning", () => {
  for (const mode of ["prefer", "require", "verify-ca"]) {
    assert.equal(
      normalizePostgresConnectionString(
        `postgresql://user:pass@db.example.com/school?sslmode=${mode}&connect_timeout=10`,
      ),
      "postgresql://user:pass@db.example.com/school?sslmode=verify-full&connect_timeout=10",
    );
  }
});

test("does not modify explicit or missing SSL modes", () => {
  const verified = "postgresql://user:pass@db.example.com/school?sslmode=verify-full";
  const local = "postgresql://user:pass@localhost:5432/school";

  assert.equal(normalizePostgresConnectionString(verified), verified);
  assert.equal(normalizePostgresConnectionString(local), local);
  assert.equal(normalizePostgresConnectionString(undefined), undefined);
});

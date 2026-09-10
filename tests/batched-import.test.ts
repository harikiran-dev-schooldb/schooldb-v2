import assert from "node:assert/strict";
import test from "node:test";

import { postImportInBatches } from "../src/lib/batched-import.ts";

test("imports one large file as sequential 500-row requests", async () => {
  const originalFetch = globalThis.fetch;
  const requestSizes: number[] = [];
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { students: unknown[] };
    requestSizes.push(body.students.length);
    return Response.json({
      success: true,
      data: { created: body.students.length, failed: 0, errors: [] },
    });
  }) as typeof fetch;

  try {
    const progress: number[] = [];
    const result = await postImportInBatches<
      { admissionNo: string },
      { created: number; failed: number; errors: unknown[] }
    >({
      endpoint: "/api/v1/students/bulk",
      bodyKey: "students",
      rows: Array.from({ length: 1_250 }, (_, index) => ({
        admissionNo: String(index + 1),
      })),
      failureMessage: "Import failed.",
      onProgress: (value) => progress.push(value.completedRows),
    });

    assert.deepEqual(requestSizes, [500, 500, 250]);
    assert.equal(result.created, 1_250);
    assert.equal(result.failed, 0);
    assert.deepEqual(progress, [0, 500, 1_000, 1_250]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("adjusts server row errors to their position in the original file", async () => {
  const originalFetch = globalThis.fetch;
  let request = 0;
  globalThis.fetch = (async () => {
    request += 1;
    return Response.json({
      success: true,
      data: {
        created: request === 1 ? 500 : 99,
        failed: request === 1 ? 0 : 1,
        errors: request === 1 ? [] : [{ row: 2, message: "Invalid row" }],
      },
    });
  }) as typeof fetch;

  try {
    const result = await postImportInBatches<
      number,
      { created: number; failed: number; errors: Array<{ row: number }> }
    >({
      endpoint: "/bulk",
      bodyKey: "rows",
      rows: Array.from({ length: 600 }, (_, index) => index),
      failureMessage: "Import failed.",
    });

    assert.equal(result.created, 599);
    assert.equal(result.failed, 1);
    assert.equal(result.errors[0]?.row, 502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  clerkErrorDetails,
  clerkErrorMessage,
} from "../src/features/auth/clerk-error.ts";

test("extracts the useful Clerk validation error fields", () => {
  const error = {
    message: "Unprocessable Entity",
    code: "api_response_error",
    status: 422,
    clerkTraceId: "trace_123",
    errors: [
      {
        code: "form_param_missing",
        longMessage: "legal_accepted_at must be included.",
        meta: { name: "legal_accepted_at" },
      },
    ],
  };

  assert.equal(clerkErrorMessage(error), "legal_accepted_at must be included.");
  assert.deepEqual(clerkErrorDetails(error), {
    name: undefined,
    message: "legal_accepted_at must be included.",
    code: "api_response_error",
    status: 422,
    clerkTraceId: "trace_123",
    errors: [
      {
        code: "form_param_missing",
        message: "legal_accepted_at must be included.",
        meta: { name: "legal_accepted_at" },
      },
    ],
  });
});

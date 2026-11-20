import type { Instrumentation } from "next";

export async function register() {
  // The hook is intentionally provider-neutral. Hosting log drains can route
  // these structured records to the school's approved monitoring service.
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context,
) => {
  const message = error instanceof Error ? error.message : String(error);
  const digest = typeof error === "object" && error !== null && "digest" in error
    ? String(error.digest)
    : undefined;
  console.error(JSON.stringify({
    event: "server_request_error",
    message,
    digest,
    route: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
    timestamp: new Date().toISOString(),
  }));
};

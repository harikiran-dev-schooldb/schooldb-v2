type ClerkErrorItem = {
  code?: unknown;
  message?: unknown;
  shortMessage?: unknown;
  longMessage?: unknown;
  meta?: unknown;
};

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function clerkErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const value = error as Record<string, unknown>;
  const errors = Array.isArray(value.errors)
    ? value.errors.map((item) => {
        const detail = (item ?? {}) as ClerkErrorItem;
        return {
          code: textValue(detail.code),
          message:
            textValue(detail.longMessage) ??
            textValue(detail.message) ??
            textValue(detail.shortMessage),
          meta: detail.meta,
        };
      })
    : [];

  return {
    name: textValue(value.name),
    message:
      errors[0]?.message ??
      textValue(value.longMessage) ??
      textValue(value.message),
    code: textValue(value.code),
    status: typeof value.status === "number" ? value.status : undefined,
    clerkTraceId: textValue(value.clerkTraceId),
    errors,
  };
}

export function clerkErrorMessage(error: unknown) {
  return clerkErrorDetails(error).message ?? null;
}

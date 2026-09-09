const SCHOOL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RESERVED_PATH_SEGMENTS = new Set([
  "api",
  "login",
  "marketing",
  "onboarding",
  "register",
]);

const PUBLIC_PATH_PATTERNS = [
  /^\/$/,
  /^\/marketing(?:\/.*)?$/,
  /^\/login(?:\/.*)?$/,
  /^\/register(?:\/.*)?$/,
  /^\/[^/]+\/login(?:\/.*)?$/,
  /^\/[^/]+\/apply(?:\/.*)?$/,
  /^\/api\/health$/,
  /^\/api\/cron\/whatsapp$/,
  /^\/api\/v1\/public\/whatsapp\/webhook$/,
  /^\/api\/v1\/public\/auth\/(?:send-otp|verify-otp)$/,
  /^\/api\/v1\/public\/admissions\/[^/]+(?:\/(?:track|documents))?$/,
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function isSchoolSlug(value: string): boolean {
  return SCHOOL_SLUG_PATTERN.test(value) && !RESERVED_PATH_SEGMENTS.has(value);
}

export function schoolSlugFromPath(pathname: string): string | null {
  const segment = pathname.split("/").filter(Boolean)[0];

  return segment && isSchoolSlug(segment) ? segment : null;
}

export function schoolSlugFromSameOriginReferer(
  referer: string | null,
  requestOrigin: string,
): string | null {
  if (!referer) return null;

  try {
    const url = new URL(referer);

    if (url.origin !== requestOrigin) return null;

    return schoolSlugFromPath(url.pathname);
  } catch {
    return null;
  }
}

export function requireSchoolSlug(value: string | null | undefined): string {
  const slug = value?.trim();

  if (!slug) {
    throw new Error("School context is required");
  }

  if (!isSchoolSlug(slug)) {
    throw new Error("Invalid school context");
  }

  return slug;
}

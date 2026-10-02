export const KOTAK_SUPPORT_SCHOOL_SLUGS = new Set(["kotak", "kotak-vsp"]);

export const SUPPORT_NAVIGATION_HREFS = new Set([
  "students",
  "teachers",
  "users",
  "classes",
  "sections",
  "queries",
  "parent-queries",
  "bulk-operations",
]);

export const SUPPORT_BULK_OPERATION_HREFS = new Set([
  "bulk-operations/students",
  "bulk-operations/teachers",
  "bulk-operations/classes",
]);

export function isKotakSupportSchool(schoolSlug: string) {
  return KOTAK_SUPPORT_SCHOOL_SLUGS.has(schoolSlug.toLowerCase());
}

export function usesSupportNavigation(
  schoolSlug: string,
  role: string,
) {
  return role === "SUPER_ADMIN" && isKotakSupportSchool(schoolSlug);
}

export function isSupportNavigationHref(href: string | undefined) {
  return href ? SUPPORT_NAVIGATION_HREFS.has(href) : false;
}

export function isSupportBulkOperationHref(href: string) {
  return SUPPORT_BULK_OPERATION_HREFS.has(href);
}

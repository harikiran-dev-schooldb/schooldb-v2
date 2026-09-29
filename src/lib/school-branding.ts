export function publicSchoolLogoUrl(
  schoolSlug: string,
  storedLogo: string | null,
  version?: Date | string | number,
) {
  if (!storedLogo) return null;
  const path = `/api/v1/public/schools/${encodeURIComponent(schoolSlug)}/logo`;
  if (!version) return path;
  const value = version instanceof Date ? version.getTime() : version;
  return `${path}?v=${encodeURIComponent(String(value))}`;
}

export const SCHOOLDB_PRODUCTION_DOMAIN = "schooldb.co.in";

export function isSchoolDbProductionHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  return normalized === SCHOOLDB_PRODUCTION_DOMAIN
    || normalized.endsWith(`.${SCHOOLDB_PRODUCTION_DOMAIN}`);
}

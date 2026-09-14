const LEGACY_SSL_MODE = /([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/i;

export function normalizePostgresConnectionString(value: string | undefined) {
  return value?.replace(LEGACY_SSL_MODE, "$1verify-full");
}

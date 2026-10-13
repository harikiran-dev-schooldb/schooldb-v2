import pg from "pg";

const { Client } = pg;

const sourceUrl = process.env.DATABASE_URL?.trim();
const restoredUrl = process.env.RESTORE_VERIFY_DATABASE_URL?.trim();

if (!sourceUrl || !restoredUrl) {
  throw new Error("DATABASE_URL and RESTORE_VERIFY_DATABASE_URL are required.");
}

function databaseIdentity(value) {
  const url = new URL(value);
  return {
    host: url.hostname.toLowerCase(),
    port: url.port || "5432",
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  };
}

const sourceIdentity = databaseIdentity(sourceUrl);
const restoredIdentity = databaseIdentity(restoredUrl);
const sameDatabase = sourceIdentity.host === restoredIdentity.host &&
  sourceIdentity.port === restoredIdentity.port &&
  sourceIdentity.database === restoredIdentity.database;

if (sameDatabase) {
  throw new Error("Restore verification must use a separate temporary database.");
}
if (!/(restore|verify)/i.test(restoredIdentity.database)) {
  throw new Error('The restored database name must contain "restore" or "verify".');
}

const countSql = `
  SELECT 'School' AS table_name, COUNT(*)::bigint AS row_count FROM "School"
  UNION ALL SELECT 'Membership', COUNT(*)::bigint FROM "Membership"
  UNION ALL SELECT 'Student', COUNT(*)::bigint FROM "Student"
  UNION ALL SELECT 'Attendance', COUNT(*)::bigint FROM "Attendance"
  UNION ALL SELECT 'FeePayment', COUNT(*)::bigint FROM "FeePayment"
  UNION ALL SELECT 'AuditLog', COUNT(*)::bigint FROM "AuditLog"
  ORDER BY table_name
`;

async function inspect(connectionString, label) {
  const client = new Client({ connectionString, application_name: "schooldb-restore-verifier" });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const [identity, tables, migrations, counts] = await Promise.all([
      client.query("SELECT current_database() AS database, current_timestamp AS checked_at"),
      client.query(`
        SELECT COUNT(*)::int AS count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `),
      client.query(`
        SELECT migration_name, finished_at, rolled_back_at
        FROM "_prisma_migrations"
        ORDER BY started_at DESC
        LIMIT 1
      `),
      client.query(countSql),
    ]);
    await client.query("COMMIT");
    const latestMigration = migrations.rows[0];
    if (!latestMigration?.finished_at || latestMigration.rolled_back_at) {
      throw new Error(`${label} does not have a successfully completed latest migration.`);
    }
    return {
      label,
      database: identity.rows[0].database,
      tableCount: tables.rows[0].count,
      latestMigration: latestMigration.migration_name,
      counts: Object.fromEntries(counts.rows.map((row) => [row.table_name, Number(row.row_count)])),
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

const [source, restored] = await Promise.all([
  inspect(sourceUrl, "source"),
  inspect(restoredUrl, "restored"),
]);

const mismatches = Object.keys(source.counts).flatMap((table) =>
  source.counts[table] === restored.counts[table]
    ? []
    : [{ table, source: source.counts[table], restored: restored.counts[table] }],
);

console.table([
  { database: source.database, tables: source.tableCount, latestMigration: source.latestMigration },
  { database: restored.database, tables: restored.tableCount, latestMigration: restored.latestMigration },
]);
console.table(Object.keys(source.counts).map((table) => ({
  table,
  source: source.counts[table],
  restored: restored.counts[table],
  matches: source.counts[table] === restored.counts[table],
})));

if (source.tableCount !== restored.tableCount || source.latestMigration !== restored.latestMigration || mismatches.length > 0) {
  throw new Error("Restore verification failed: schema or critical record counts differ.");
}

console.log("Restore verification passed. The temporary restored database matches the source checks.");

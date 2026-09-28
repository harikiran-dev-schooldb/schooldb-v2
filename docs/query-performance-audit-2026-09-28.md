# Query Performance Audit — 28 September 2026

## Executive summary

The current application is appropriately indexed for its present local data size,
but seven query paths benefited from immediate changes:

1. Notification creation performed redundant existence reads before inserts that
   were already protected by the unique `Announcement.dedupeKey` constraint.
2. Fee-installment generation repeatedly loaded existing installments, academic
   periods, and custom schedules inside a loop.
3. Frequent teacher authorization queries did not have indexes matching their
   complete filters.
4. The student-image approval page loaded an unlimited result set and selected
   columns it did not render.
5. The attendance dashboard loaded every attendance record in the active academic
   year and calculated low attendance in the application.
6. The main reports page loaded every attendance record and exam mark in the
   selected range to calculate totals, trends, averages, and rankings.
7. The dashboard birthday card loaded every active student even though it renders
   at most four birthdays for the current day.

These issues were corrected in this audit. A second pass also consolidated the
dashboard API, bounded every dedicated Excel export, added durable private report
exports, optimized daily birthday jobs, and inspected the connected Vercel and
Neon production projects.

## Evidence and limitations

- The codebase contains 327 Prisma `findMany` calls across 71 models.
- 255 calls do not specify `take`. Many are legitimate bounded lookup, bulk,
  export, or class-roster queries; they are not automatically defects.
- The configured local database is PostgreSQL on `localhost`, not the production
  Neon endpoint.
- Local data is small: approximately 499 students, 499 enrollments, 752 teacher
  allocations, and 1,000 student activities.
- `pg_stat_statements` is not enabled locally, so cumulative SQL timing data was
  unavailable.
- Local sequential scans on tables with tens or hundreds of rows are expected;
  PostgreSQL often correctly chooses them instead of an index.

## Changes completed

### 1. Notification deduplication

File: `src/features/notifications/events.ts`

The notification helper previously queried by `dedupeKey`, then inserted. Several
callers also ran a broader `findFirst` before calling the helper. A first-time
notification could therefore require three reads/writes before push delivery.

The helper now attempts the uniquely constrained insert directly and handles a
`P2002` race by fetching the existing row. Homework, exam result, fee-payment,
attendance-summary, and absence notification paths no longer perform redundant
preflight reads. Birthday dedupe keys are fetched in one batch so a repeated daily
run remains inexpensive and its `created` count stays meaningful.

Expected effect:

- First-time event notification: generally one insert instead of two existence
  reads plus one insert.
- Birthday job: one batched dedupe read plus required inserts instead of one or
  more reads per matching student.
- Concurrency safety is retained by the unique `Announcement.dedupeKey` index.

### 2. Fee-installment generation

File: `src/features/fees/services/fee-installment.service.ts`

The old implementation queried existing installments once per fee-plan item,
queried academic periods once per termly item, queried custom schedules once per
custom item, and inserted each generated item separately.

The new implementation:

- Loads only required plan, academic-year, item, existing-installment, and custom
  schedule fields.
- Detects existing schedules from the initial plan query.
- Loads academic periods at most once.
- Builds all new installment rows in memory.
- Sends all generated rows through one bulk `createMany` call.

For a plan with `N` items, application-level database calls change from roughly
`1 + N existence reads + per-type reads + N inserts` to one plan load, at most one
period load, and one bulk insert.

### 3. Teacher authorization indexes

Files:

- `prisma/schema.prisma`
- `prisma/migrations/20260928093000_query_performance_indexes/migration.sql`

Added indexes:

```sql
CREATE INDEX "Teacher_schoolId_clerkId_active_idx"
ON "Teacher"("schoolId", "clerkId", "active");

CREATE INDEX "TeacherAllocation_schoolId_teacherId_active_idx"
ON "TeacherAllocation"("schoolId", "teacherId", "active");
```

Why:

- `requireCurrentTeacher` repeatedly filters by `schoolId`, Clerk identity, and
  active status during teacher requests.
- Student, homework, results, leave, reports, and teacher-dashboard authorization
  repeatedly filter allocations by `schoolId`, `teacherId`, and `active`.
- The existing allocation indexes were led by academic year or active status and
  did not efficiently narrow by teacher.

The migration was applied successfully to the local database and both indexes
were verified in `pg_indexes`.

### 4. Profile-image approval list

File: `src/app/[schoolSlug]/(app)/settings/page.tsx`

The settings page now:

- Loads at most 100 pending requests.
- Selects only `id`, `createdAt`, and the student name/admission number needed by
  the component.

This prevents an unexpectedly large settings payload and avoids reading storage
metadata that is not displayed.

### 5. Main dashboard attendance

Files:

- `src/features/attendance/repositories/attendance.repository.ts`
- `src/features/attendance/services/attendance.service.ts`
- `src/app/[schoolSlug]/(app)/dashboard/page.tsx`

The attendance card previously returned every active enrollment and every
attendance row in the active academic year to Node.js, grouped those rows by
student, and calculated the low-attendance count in memory. It also loaded today's
records twice: once for overall totals and once grouped by class.

The dashboard now:

- Uses `COUNT` for total active students instead of returning every enrollment.
- Uses the existing PostgreSQL low-attendance summary query instead of transferring
  the full academic-year attendance dataset.
- Derives today's overall status totals and class totals from one bounded result.
- Removes the second HTTP call that requested the same low-attendance count.

Database work inside the attendance dashboard changed from six post-academic-year
queries to four, and the largest unbounded result set was removed. The later
dashboard consolidation described below now serves the dashboard through one
role-aware browser request.

### 6. Reports & Analytics aggregation

File: `src/features/reports/report.service.ts`

The main report previously returned one database row per attendance record and one
row per exam mark for the date range, then calculated attendance totals, daily
charts, subject averages, and pass rates in Node.js.

PostgreSQL now performs those calculations with one `GROUPING SETS` query. It
returns compact groups for:

- Overall status totals.
- Status totals per day.
- Status totals per student.

Exam analytics now use a second database aggregate that returns one overall row and
one row per subject. The overall average, pass rate, mark count, subject averages,
and subject pass rates retain the same formulas.

The API response and report calculations are unchanged, but application memory and
database-to-function transfer now scale with students, days, and subjects rather
than with the number of attendance and exam records. This benefits the web report,
CSV export, and mobile admin report because all three use the same service.

### 7. Dashboard birthday summary

File: `src/app/api/v1/birthdays/route.ts`

The `summary=1` dashboard request previously loaded every active student and one
enrollment per student, calculated birthdays in Node.js, and discarded all but
four rows. It now filters the current month/day in PostgreSQL, selects the latest
active enrollment with a lateral join, returns at most four students, and gets the
full birthday count with a window aggregate.

On the local 499-student dataset, PostgreSQL executed the new query in about
1.4 ms. The same query shape is now used by daily notification and WhatsApp jobs,
with a partial birthday expression index for active students.

## Follow-up recommendations completed

### 8. Production Vercel and Neon evidence

Vercel production traces for the preceding 24 hours confirmed separate requests
to attendance dashboard, fee dashboard, students, teachers, classes, houses,
birthdays, low-attendance, and fee-outstanding endpoints during dashboard loads.
That evidence supports consolidation without removing the dedicated endpoints.

The connected Neon project `cool-wildflower-93956355` was also inspected:

- The production branch is ready and no query was stalled for more than 30 seconds.
- Production tables remain small; the highest recorded sequential scan counts were
  Teacher 2,260, Announcement 1,651, StudentFeeItem 806, StudentFee 652, and
  Student 569. Scan counts do not include duration and are not grounds for another
  index by themselves.
- `pg_stat_statements` is not installed, so Neon could not return Query Insights'
  slowest-query list. Installing that extension changes production database state
  and was intentionally not done as part of this read-only telemetry check.
- The project has `suspend_timeout_seconds: 0`, which explains why its compute can
  remain active continuously. This is a cost/configuration finding, not a slow SQL
  query.

No speculative general-purpose index was added from these scan counters.

### 9. Role-aware dashboard endpoint

Files:

- `src/app/api/v1/dashboard/route.ts`
- `src/app/[schoolSlug]/(app)/dashboard/page.tsx`
- `src/features/fees/services/fee-dashboard.service.ts`

The web dashboard now makes one request to `/api/v1/dashboard`. The endpoint does
one tenant authorization, enforces teacher allocation scope, runs permitted
attendance/fee/staff sections in parallel, and returns the existing UI shape. The
old focused endpoints remain available to their dedicated pages. A structured
duration log with the Vercel request ID was added for post-deployment comparison.

### 10. Scheduled birthday processing

Files:

- `src/features/students/services/birthday-summary.service.ts`
- `src/features/notifications/events.ts`
- `src/features/whatsapp/automation.ts`
- `prisma/migrations/20260928143000_birthday_lookup_index/migration.sql`

Both daily jobs now query only active students whose month/day matches today and
who have an active enrollment. Filtering moved from application memory into
PostgreSQL. A partial expression index on birth month/day and school for active
students supports the daily lookup without adding redundant columns.

### 11. Export limits

Files: all dedicated Excel routes under
`src/app/api/v1/reports/[schoolSlug]` and `src/lib/reports/limits.ts`.

Every dedicated Excel export now stops at 5,000 source rows and returns HTTP 413
with an actionable message to narrow academic-year/date/class/section/status
filters. Routes capable of large direct reads fetch at most 5,001 rows, so they
can detect the limit without loading the full dataset or starting workbook
formatting.

### 12. Durable private background exports

Files:

- `prisma/schema.prisma`
- `src/features/reports/report-export.service.ts`
- `src/app/api/v1/report-exports/route.ts`
- `src/app/api/v1/report-exports/[id]/route.ts`
- `src/app/api/v1/report-exports/[id]/download/route.ts`
- `src/features/reports/ReportExportButton.tsx`
- `src/lib/private-storage.ts`

Analytics CSV exports now create a durable `ReportExportJob`. Immediate processing
runs after the HTTP response; interrupted or failed jobs are retried by the secured
daily worker, up to three attempts. Completed files use private Vercel Blob, are
downloaded only through a tenant- and user-authorized route, and expire after seven
days. The same private-storage implementation falls back to local disk only in
development. Production still requires the configured Blob credentials.

## Remaining scale work

### High at multi-school scale: searchable option endpoints

Files:

- `src/features/students/repositories/student.repository.ts`
- `src/features/student-enrollments/repositories/student-enrollment.repository.ts`
- `src/features/teacher-allocations/repositories/teacher-allocation.repository.ts`

The `options` methods return all matching rows. They are reasonable for current
school sizes but will produce large payloads and expensive relation loads at
thousands of students or allocations.

Recommended future change: convert selection controls to server-side search with
20–50 results per request, cursor pagination, and minimal `select` projections.

### Medium at deep page numbers: offset pagination

Student and teacher directories correctly cap page size, but use `skip`/offset
pagination. Deep offsets become more expensive as tables grow. Cursor pagination
is preferable after directories reach tens of thousands of rows.

### No change needed now

- Student activity already uses cursor pagination and has a matching
  `(studentId, createdAt)` index.
- Bulk exam-mark updates are limited to parallel chunks of 25.
- WhatsApp provider calls are bounded to groups of five; individual outcome
  updates are necessary because every recipient can return a different provider
  result.
- The main student and teacher directory APIs cap page size at 100.

## Verification performed

- `npm run typecheck` — passed.
- `npm test` — 62 tests passed.
- Full `npm run lint` — passed without warnings.
- `npx prisma validate` — passed.
- `npx prisma migrate deploy` against local PostgreSQL — passed.
- All new migrations, including the birthday index and report-export job table,
  were applied successfully to local PostgreSQL.
- Read-only `EXPLAIN (ANALYZE, BUFFERS)` checks confirmed all three new raw SQL
  query shapes execute successfully against local PostgreSQL.
- `npx next build --webpack` — passed. The default Turbopack build could not bind
  its internal worker port in this restricted workspace; this was an environment
  limitation, not a source compilation error.

## Production rollout

The repository's production build already runs Prisma migrations through
`npm run db:migrate:deploy`. Ensure `DIRECT_DATABASE_URL` is configured with the
direct Neon endpoint before deploying. After release, compare Neon Query Insights
for at least one normal school day before making another indexing pass. The
production database first needs `CREATE EXTENSION pg_stat_statements`; obtain
explicit production-change approval before enabling it.

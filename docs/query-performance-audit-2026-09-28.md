# Query Performance Audit — 28 September 2026

## Executive summary

The current application is appropriately indexed for its present local data size,
but four query paths benefited from immediate changes:

1. Notification creation performed redundant existence reads before inserts that
   were already protected by the unique `Announcement.dedupeKey` constraint.
2. Fee-installment generation repeatedly loaded existing installments, academic
   periods, and custom schedules inside a loop.
3. Frequent teacher authorization queries did not have indexes matching their
   complete filters.
4. The student-image approval page loaded an unlimited result set and selected
   columns it did not render.

These issues were corrected in this audit. Production query telemetry was not
available, so the remaining recommendations are prioritized static findings and
must be confirmed with Neon Query Insights or `pg_stat_statements` before further
index creation.

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

## Remaining work, ordered by importance

### High: confirm production pooling and collect production query timings

The Vercel `DATABASE_URL` should use Neon's pooled hostname containing
`-pooler`. Schema migrations should use the direct `DIRECT_DATABASE_URL`.
The local environment uses `localhost`, so this audit could not verify production
configuration.

Use Neon Query Insights during normal peak traffic and record:

- Queries with the highest total execution time.
- Queries with high p95 latency.
- Rows read versus rows returned.
- Connection count and compute utilization during morning attendance and fee
  collection peaks.

Do not add indexes solely from local sequential-scan counts. The local tables are
too small for those plans to represent production.

### High at 10,000+ students: birthday selection

File: `src/features/notifications/events.ts`

`notifyDailyBirthdays` currently loads every active student with an active
enrollment and filters month/day in Node.js. This is acceptable for hundreds or a
few thousand students once daily, but it causes unnecessary database egress as
the tenant count grows.

Recommended future change: persist an indexed `birthMonth` and `birthDay`, or use
a carefully tested PostgreSQL expression index and SQL query. Make this change
when production row counts or Query Insights show material cost.

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

### Medium: report/export endpoints

Files under `src/features/reports` and `src/app/api/v1/reports` intentionally load
complete filtered datasets. Large attendance, fee, and exam reports can consume
substantial function memory and hold database connections while formatting files.

Recommended future changes:

- Require academic-year/date/class filters for large reports.
- Add an explicit maximum export size with a helpful error.
- Move very large exports to an asynchronous job and private Blob download.
- Consider a Neon read replica only after production metrics show reporting is
  affecting transactional traffic.

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
- Targeted ESLint for changed TypeScript/TSX files — passed.
- `npx prisma validate` — passed.
- `npx prisma migrate deploy` against local PostgreSQL — passed.
- Both new indexes verified through `pg_indexes`.

## Production rollout

The repository's production build already runs Prisma migrations through
`npm run db:migrate:deploy`. Ensure `DIRECT_DATABASE_URL` is configured with the
direct Neon endpoint before deploying. After release, compare Neon Query Insights
for at least one normal school day before making another indexing pass.

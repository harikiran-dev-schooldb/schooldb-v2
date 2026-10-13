# Production readiness target: 250 active users

The application now has a configurable PostgreSQL connection pool, a public health endpoint, database-backed OTP request limits, and a repeatable load test.

## Database pool

Start with `DATABASE_POOL_MAX=5` for serverless hosting or `10` for one long-running app server. Keep the total possible app connections below roughly 80% of the database provider's connection limit:

`maximum app instances × DATABASE_POOL_MAX <= safe database connections`

Use the provider's pooled PostgreSQL URL when available. Do not use the local `localhost` database URL in production.

## Health and monitoring

Configure the hosting provider's uptime monitor to request `/api/health`. A healthy response is HTTP 200 and includes database latency. A database failure returns HTTP 503. Application errors should be collected from structured server logs.

## OTP protection

The default fixed window permits five send attempts per mobile number and 20 per source IP every ten minutes, scoped per school. The existing 30-second resend cooldown remains active. Adjust these limits only after reviewing real traffic.

## Notifications and WhatsApp alerts

Homework, exam-result, fee and general-announcement notifications are delivered through the SchoolDB Android/web app. Manual WhatsApp announcements are disabled. Fee reminders are started manually by an authorized administrator and are delivered only through the app.

Set `META_WA_AUTOMATION_ENABLED=true` only after Meta credentials and the approved birthday, student-attendance and staff-attendance templates are configured. Staff absence alerts additionally require `META_WA_STAFF_ATTENDANCE_TEMPLATE` and are queued only when an active staff member with a valid mobile number is newly marked absent. WhatsApp attendance alerts are queued only for absent students when attendance is locked. Birthday WhatsApp wishes are queued by the daily cron only for active students whose **WhatsApp alerts approved** switch is enabled. Existing students remain opted out until the school records consent. Template-specific alerts do not fall back to a generic announcement template.

The Vercel cron in `vercel.json` runs at 8:00 AM India time. Configure a strong `CRON_SECRET`; Vercel sends it to the protected cron route as a bearer token.

For accurate delivery tracking, configure the Meta App webhook callback as `https://YOUR_DOMAIN/api/v1/public/whatsapp/webhook`, copy `META_WA_WEBHOOK_VERIFY_TOKEN` into Meta's verify-token field, and add the Meta App Secret as `META_APP_SECRET`. Subscribe the WhatsApp Business Account to the `messages` webhook field. The endpoint validates Meta's SHA-256 signature before accepting status events.

WhatsApp recipients, push deliveries, and large report exports are stored as durable database jobs. Interrupted WhatsApp recipients and push workers are recovered automatically, and provider failures are retried up to three times. Push delivery is attempted immediately when an announcement is published; Vercel's Hobby-compatible daily worker at 8:15 AM India time recovers interrupted or failed jobs. The daily automation worker runs at 8:00 AM India time. Keep `CRON_SECRET` configured so neither worker can be invoked anonymously.

## Load test

Run against a production build or staging deployment, not against real student traffic:

```sh
npm run build
npm run start
LOAD_TEST_CONCURRENCY=250 LOAD_TEST_DURATION_SECONDS=30 npm run load:test
```

The default pass criteria are no more than 1% failed requests and p95 latency no higher than 1,000 ms. The health test measures web-server and database connectivity capacity; key authenticated workflows should also be tested with synthetic staging accounts before launch.

For a mixed authenticated staging run, provide comma-separated endpoints and a
dedicated test account's cookie through the environment (never commit it):

```sh
LOAD_TEST_URLS="https://staging.example.com/api/health,https://staging.example.com/api/v1/dashboard" \
LOAD_TEST_SCHOOL_SLUG="demo-school" \
LOAD_TEST_COOKIE="__session=..." \
LOAD_TEST_CONCURRENCY=250 \
LOAD_TEST_DURATION_SECONDS=30 \
npm run load:test
```

The test distributes requests across the supplied endpoints and reports both the
combined latency/error threshold and per-target request/error counts.

## Backup restore drill

Provider backup status is configuration, not proof that a restore works. At least
once before launch, restore a recent backup into a separate temporary database
whose name contains `restore` or `verify`, then run the read-only comparison:

```sh
DATABASE_URL="postgresql://.../schooldb" \
RESTORE_VERIFY_DATABASE_URL="postgresql://.../schooldb_restore_verify" \
npm run db:restore:verify
```

The verifier refuses to target the source database. It compares the latest Prisma
migration, public table count, and critical record counts for schools,
memberships, students, attendance, payments, and audit logs. Delete the temporary
restore through the database provider only after the check passes.

## Before launch

- Deploy to production hosting and a managed PostgreSQL service in the same region.
- Apply migrations with `npm run db:migrate:deploy` during deployment. Vercel production
  deployments run this automatically through the `vercel-build` script before building.
- Set `DIRECT_DATABASE_URL` in Vercel to the direct, non-pooler Neon connection. Keep
  `DATABASE_URL` pointed at the pooled connection for application traffic.
- Configure production environment secrets; never copy the local `.env` file.
- Add an uptime alert for `/api/health` and alerts for HTTP 5xx rates and slow responses.
- Confirm the durable push, WhatsApp, and report-export workers are running and their backlogs remain near zero on **System Health**.
- Connect private Vercel Blob storage before using multiple app instances; production uploads intentionally fail instead of falling back to local disk.
- Test a provider backup restore with `npm run db:restore:verify` before onboarding schools.

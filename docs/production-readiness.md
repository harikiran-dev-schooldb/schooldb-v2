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

Set `META_WA_AUTOMATION_ENABLED=true` only after Meta credentials and the approved birthday and attendance templates are configured. WhatsApp attendance alerts are queued only for absent students when attendance is locked. Birthday WhatsApp wishes are queued by the daily cron only for active students whose **WhatsApp alerts approved** switch is enabled. Existing students remain opted out until the school records consent. Template-specific alerts do not fall back to a generic announcement template.

The Vercel cron in `vercel.json` runs at 8:00 AM India time. Configure a strong `CRON_SECRET`; Vercel sends it to the protected cron route as a bearer token.

For accurate delivery tracking, configure the Meta App webhook callback as `https://YOUR_DOMAIN/api/v1/public/whatsapp/webhook`, copy `META_WA_WEBHOOK_VERIFY_TOKEN` into Meta's verify-token field, and add the Meta App Secret as `META_APP_SECRET`. Subscribe the WhatsApp Business Account to the `messages` webhook field. The endpoint validates Meta's SHA-256 signature before accepting status events.

The scheduled route also retries queued automatic campaigns in small batches. Before enabling automatic messages for a large school, move delivery to a durable queue so work survives function time limits and provider outages.

## Load test

Run against a production build or staging deployment, not against real student traffic:

```sh
npm run build
npm run start
LOAD_TEST_CONCURRENCY=250 LOAD_TEST_DURATION_SECONDS=30 npm run load:test
```

The default pass criteria are no more than 1% failed requests and p95 latency no higher than 1,000 ms. The health test measures web-server and database connectivity capacity; key authenticated workflows should also be tested with synthetic staging accounts before launch.

## Before launch

- Deploy to production hosting and a managed PostgreSQL service in the same region.
- Apply migrations with `npm run db:migrate:deploy` during deployment. Vercel production
  deployments run this automatically through the `vercel-build` script before building.
- Set `DIRECT_DATABASE_URL` in Vercel to the direct, non-pooler Neon connection. Keep
  `DATABASE_URL` pointed at the pooled connection for application traffic.
- Configure production environment secrets; never copy the local `.env` file.
- Add an uptime alert for `/api/health` and alerts for HTTP 5xx rates and slow responses.
- Move bulk messages, reports, and large imports to a durable background queue before enabling them at high volume.
- Replace local `SCHOOLDB_PRIVATE_STORAGE_DIR` document storage with private object storage such as S3 or Vercel Blob before using multiple app instances.
- Test backups and a database restore before onboarding schools.

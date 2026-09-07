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
- Apply migrations with `npx prisma migrate deploy` during deployment.
- Configure production environment secrets; never copy the local `.env` file.
- Add an uptime alert for `/api/health` and alerts for HTTP 5xx rates and slow responses.
- Move bulk messages, reports, and large imports to a durable background queue before enabling them at high volume.
- Test backups and a database restore before onboarding schools.

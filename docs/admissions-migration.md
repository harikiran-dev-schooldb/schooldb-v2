# Admissions consolidation — phase 1

Target: SchoolDB's existing /[schoolSlug]/admissions and /[schoolSlug]/apply. Keep the standalone admissions deployment and source database intact.

This phase ports configurable age limits: existing academic years start without rules, admins can set a cutoff and inclusive min/max months for each class, public application checks use the server's school/year/class scope, and settings changes are audited. No school names, fees or cutoff dates are assumed.

Before release: run Prisma validate/generate, lint, typecheck, unit tests and production build using a disposable database; apply the additive migration to a staging database; verify two-school access isolation for writes and public requests. Confirm mobile forms and role-based settings access.

Remaining migration:
1. Inventory and map authorized source records to an explicit SchoolDB school ID; match academic years and classes by reviewed mapping, not name alone.
2. Preserve legacy enquiries separately until missing DOB, gender, contact relationship and class mapping are verified. Never invent student data or create enrolled students from incomplete enquiries.
3. Port enquiry intake, entrance/interview stages, pre-enrollment follow-ups, notifications, seat planning, reporting and fee mapping. Existing SchoolDB approval/conversion remains authoritative.
4. Build an idempotent dry-run import with source IDs and counts, preserve immutable audit history and consent, reconcile documents and fee records, validate backups and rollback. Do not automatically migrate passwords or send notifications.
5. Obtain school authorization and approval of age rules/fees, test on an isolated environment, and release via main only after checks pass. Retire the standalone app only after reconciliation and sign-off.

## Phase 2 draft

School-scoped enquiry capture, duplicate checks, linking to a verified existing application, optional entrance/interview stages and assigned parent follow-up tasks have been added. Stages default to NOT_REQUIRED to preserve existing workflows; an administrator can waive a configured stage. Approval and conversion reject pending, scheduled or failed stages. Follow-up scheduling is IST and overdue status is displayed on the intake page; automatic push/email reminders are not part of this phase. Existing enquiries may be linked after a full application is submitted, rather than guessing missing application fields. Test cross-school requests, inactive assignees, approval/transition races, linking, mobile layout and migration against disposable data before production.

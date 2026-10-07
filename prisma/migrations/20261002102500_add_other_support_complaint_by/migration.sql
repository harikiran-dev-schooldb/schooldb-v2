-- Some databases received the complaint-by enum before this migration was
-- recorded, while a clean migration replay creates it in the next migration.
-- Keep this step safe for both histories; the later 123000 migration adds the
-- value after the enum is created during a fresh deployment.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'SupportTicketComplaintBy'
  ) THEN
    ALTER TYPE "SupportTicketComplaintBy" ADD VALUE IF NOT EXISTS 'OTHER';
  END IF;
END
$$;

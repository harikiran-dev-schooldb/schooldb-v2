CREATE TYPE "StudentFollowUpOutcome" AS ENUM ('IMPROVED', 'CONTINUE_SUPPORT', 'REFERRED', 'NO_RESPONSE');

ALTER TABLE "StudentFollowUp"
ADD COLUMN "parentContactedAt" TIMESTAMP(3),
ADD COLUMN "closureNotes" VARCHAR(1000),
ADD COLUMN "outcome" "StudentFollowUpOutcome",
ADD COLUMN "escalationLevel" INTEGER NOT NULL DEFAULT 0;

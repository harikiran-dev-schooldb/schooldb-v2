ALTER TABLE "OtpChallenge"
ADD COLUMN "candidateUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "verifiedAt" TIMESTAMP(3);

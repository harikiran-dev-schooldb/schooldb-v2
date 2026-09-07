CREATE TABLE "RequestRateLimit" (
    "keyHash" VARCHAR(64) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestRateLimit_pkey" PRIMARY KEY ("keyHash")
);

CREATE INDEX "RequestRateLimit_expiresAt_idx" ON "RequestRateLimit"("expiresAt");

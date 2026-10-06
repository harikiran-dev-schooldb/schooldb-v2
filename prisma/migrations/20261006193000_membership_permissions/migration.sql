ALTER TABLE "Membership"
ADD COLUMN "customPermissionsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

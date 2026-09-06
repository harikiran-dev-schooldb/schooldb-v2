ALTER TABLE "User" ADD COLUMN "phone" TEXT;

CREATE INDEX "User_phone_idx" ON "User"("phone");

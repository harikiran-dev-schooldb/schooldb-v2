ALTER TABLE "PushDevice"
ADD COLUMN "fcmToken" TEXT,
ADD COLUMN "app" TEXT NOT NULL DEFAULT 'SCHOOLDB';

CREATE INDEX "PushDevice_app_enabled_idx" ON "PushDevice"("app", "enabled");

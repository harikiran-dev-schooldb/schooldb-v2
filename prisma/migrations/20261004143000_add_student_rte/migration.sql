ALTER TABLE "Student"
ADD COLUMN "isRte" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Student"
SET "isRte" = true
WHERE "category" = 'RTE';

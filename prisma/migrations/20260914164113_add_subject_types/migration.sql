-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubjectType" ADD VALUE 'CO_CURRICULAR';
ALTER TYPE "SubjectType" ADD VALUE 'CORE';
ALTER TYPE "SubjectType" ADD VALUE 'ACTIVITY';
ALTER TYPE "SubjectType" ADD VALUE 'LANGUAGE';

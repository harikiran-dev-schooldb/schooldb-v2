-- Remove route-access settings from memberships after access control moved to
-- the School model. All legacy membership values were verified as defaults.
ALTER TABLE "Membership"
DROP COLUMN "allowedRoutes",
DROP COLUMN "routeAccessRestricted";

-- Align the database index name with the name Prisma derives from the schema.
ALTER INDEX "ClassTeacherAssignment_schoolId_academicYearId_classId_sectionI"
RENAME TO "ClassTeacherAssignment_schoolId_academicYearId_classId_sect_key";

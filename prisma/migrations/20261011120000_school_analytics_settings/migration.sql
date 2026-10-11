CREATE TABLE "SchoolAnalyticsSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "lowAttendanceThreshold" DECIMAL(5,2) NOT NULL DEFAULT 75.00,
    "attendanceTarget" DECIMAL(5,2) NOT NULL DEFAULT 90.00,
    "academicPassTarget" DECIMAL(5,2) NOT NULL DEFAULT 75.00,
    "monthlyCollectionTarget" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "monthlyExpenseBudget" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "monthlyAdmissionsTarget" INTEGER NOT NULL DEFAULT 0,
    "lateCountsAsPresent" BOOLEAN NOT NULL DEFAULT false,
    "feeOverdueAlertDays" INTEGER NOT NULL DEFAULT 30,
    "routeCapacityWarningPercent" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolAnalyticsSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolAnalyticsSetting_schoolId_key" ON "SchoolAnalyticsSetting"("schoolId");
CREATE INDEX "SchoolAnalyticsSetting_schoolId_idx" ON "SchoolAnalyticsSetting"("schoolId");

ALTER TABLE "SchoolAnalyticsSetting"
ADD CONSTRAINT "SchoolAnalyticsSetting_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

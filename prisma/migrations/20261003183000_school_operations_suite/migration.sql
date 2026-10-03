-- Staff attendance, leave and payroll
CREATE TABLE "StaffAttendance" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "teacherId" TEXT NOT NULL, "date" DATE NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'PRESENT', "checkIn" VARCHAR(8), "checkOut" VARCHAR(8),
  "source" VARCHAR(24) NOT NULL DEFAULT 'MANUAL', "deviceRef" VARCHAR(120), "remarks" VARCHAR(500),
  "recordedBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StaffAttendance_schoolId_teacherId_date_key" ON "StaffAttendance"("schoolId", "teacherId", "date");
CREATE INDEX "StaffAttendance_schoolId_date_status_idx" ON "StaffAttendance"("schoolId", "date", "status");

CREATE TABLE "StaffLeaveRequest" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "teacherId" TEXT NOT NULL, "leaveType" VARCHAR(40) NOT NULL DEFAULT 'CASUAL',
  "startDate" DATE NOT NULL, "endDate" DATE NOT NULL, "days" DECIMAL(5,2) NOT NULL, "reason" VARCHAR(1000) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING', "decisionNote" VARCHAR(500), "requestedBy" TEXT NOT NULL,
  "decidedBy" TEXT, "decidedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffLeaveRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StaffLeaveRequest_schoolId_status_startDate_idx" ON "StaffLeaveRequest"("schoolId", "status", "startDate");
CREATE INDEX "StaffLeaveRequest_teacherId_startDate_idx" ON "StaffLeaveRequest"("teacherId", "startDate");

CREATE TABLE "SalaryStructure" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "teacherId" TEXT NOT NULL, "effectiveFrom" DATE NOT NULL,
  "basicSalary" DECIMAL(12,2) NOT NULL, "allowances" JSONB NOT NULL DEFAULT '{}', "deductions" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true, "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SalaryStructure_teacherId_effectiveFrom_key" ON "SalaryStructure"("teacherId", "effectiveFrom");
CREATE INDEX "SalaryStructure_schoolId_active_effectiveFrom_idx" ON "SalaryStructure"("schoolId", "active", "effectiveFrom");

CREATE TABLE "PayrollRun" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "year" INTEGER NOT NULL, "month" INTEGER NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'DRAFT', "processedBy" TEXT NOT NULL, "processedAt" TIMESTAMP(3), "paidAt" TIMESTAMP(3),
  "notes" VARCHAR(1000), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollRun_schoolId_year_month_key" ON "PayrollRun"("schoolId", "year", "month");
CREATE INDEX "PayrollRun_schoolId_year_month_idx" ON "PayrollRun"("schoolId", "year", "month");

CREATE TABLE "PayrollEntry" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "payrollRunId" TEXT NOT NULL, "teacherId" TEXT NOT NULL,
  "basicSalary" DECIMAL(12,2) NOT NULL, "allowanceTotal" DECIMAL(12,2) NOT NULL DEFAULT 0, "deductionTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "grossSalary" DECIMAL(12,2) NOT NULL, "netSalary" DECIMAL(12,2) NOT NULL, "breakdown" JSONB NOT NULL DEFAULT '{}',
  "paymentStatus" VARCHAR(24) NOT NULL DEFAULT 'PENDING', "paymentMode" VARCHAR(40), "paymentRef" VARCHAR(120), "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayrollEntry_payrollRunId_teacherId_key" ON "PayrollEntry"("payrollRunId", "teacherId");
CREATE INDEX "PayrollEntry_schoolId_paymentStatus_idx" ON "PayrollEntry"("schoolId", "paymentStatus");

-- Campus safety and student care
CREATE TABLE "VisitorLog" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "visitorName" VARCHAR(160) NOT NULL, "phone" VARCHAR(24) NOT NULL,
  "purpose" VARCHAR(300) NOT NULL, "personToMeet" VARCHAR(160), "idProofType" VARCHAR(60), "idProofLastFour" VARCHAR(4),
  "gatePassCode" VARCHAR(20) NOT NULL, "vehicleNumber" VARCHAR(30), "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkOutAt" TIMESTAMP(3), "status" VARCHAR(24) NOT NULL DEFAULT 'CHECKED_IN', "recordedBy" TEXT NOT NULL, "notes" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VisitorLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VisitorLog_schoolId_gatePassCode_key" ON "VisitorLog"("schoolId", "gatePassCode");
CREATE INDEX "VisitorLog_schoolId_status_checkInAt_idx" ON "VisitorLog"("schoolId", "status", "checkInAt" DESC);
CREATE INDEX "VisitorLog_schoolId_phone_idx" ON "VisitorLog"("schoolId", "phone");

CREATE TABLE "StudentHealthRecord" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "bloodGroup" VARCHAR(12), "allergies" VARCHAR(1000),
  "medicalConditions" VARCHAR(1000), "medications" VARCHAR(1000), "accessibilityNeeds" VARCHAR(1000), "emergencyContact" VARCHAR(160),
  "emergencyPhone" VARCHAR(24), "physicianName" VARCHAR(160), "physicianPhone" VARCHAR(24), "insuranceDetails" VARCHAR(500),
  "consentNotes" VARCHAR(1000), "updatedBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentHealthRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentHealthRecord_studentId_key" ON "StudentHealthRecord"("studentId");
CREATE INDEX "StudentHealthRecord_schoolId_updatedAt_idx" ON "StudentHealthRecord"("schoolId", "updatedAt" DESC);

CREATE TABLE "StudentHealthVisit" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "complaint" VARCHAR(500) NOT NULL, "actionTaken" VARCHAR(1000) NOT NULL, "disposition" VARCHAR(40) NOT NULL DEFAULT 'RETURNED_TO_CLASS',
  "guardianNotified" BOOLEAN NOT NULL DEFAULT false, "followUpAt" TIMESTAMP(3), "recordedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentHealthVisit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudentHealthVisit_schoolId_occurredAt_idx" ON "StudentHealthVisit"("schoolId", "occurredAt" DESC);
CREATE INDEX "StudentHealthVisit_studentId_occurredAt_idx" ON "StudentHealthVisit"("studentId", "occurredAt" DESC);

CREATE TABLE "PickupAuthorization" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "authorizedName" VARCHAR(160) NOT NULL,
  "relationship" VARCHAR(80) NOT NULL, "phone" VARCHAR(24) NOT NULL, "photoUrl" TEXT, "validFrom" DATE NOT NULL, "validUntil" DATE,
  "pickupCode" VARCHAR(20) NOT NULL, "recurring" BOOLEAN NOT NULL DEFAULT false, "status" VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  "approvedBy" TEXT NOT NULL, "notes" VARCHAR(500), "lastUsedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PickupAuthorization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PickupAuthorization_schoolId_pickupCode_key" ON "PickupAuthorization"("schoolId", "pickupCode");
CREATE INDEX "PickupAuthorization_schoolId_status_validFrom_idx" ON "PickupAuthorization"("schoolId", "status", "validFrom");
CREATE INDEX "PickupAuthorization_studentId_status_idx" ON "PickupAuthorization"("studentId", "status");

-- Assets and facilities
CREATE TABLE "InventoryItem" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "assetCode" TEXT NOT NULL, "name" VARCHAR(160) NOT NULL, "category" VARCHAR(80) NOT NULL,
  "location" VARCHAR(120), "quantity" INTEGER NOT NULL DEFAULT 0, "reorderLevel" INTEGER NOT NULL DEFAULT 0, "unitCost" DECIMAL(12,2),
  "condition" VARCHAR(24) NOT NULL DEFAULT 'GOOD', "custodian" VARCHAR(160), "purchaseDate" DATE, "warrantyUntil" DATE,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryItem_schoolId_assetCode_key" ON "InventoryItem"("schoolId", "assetCode");
CREATE INDEX "InventoryItem_schoolId_active_category_idx" ON "InventoryItem"("schoolId", "active", "category");
CREATE INDEX "InventoryItem_schoolId_quantity_reorderLevel_idx" ON "InventoryItem"("schoolId", "quantity", "reorderLevel");

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "itemId" TEXT NOT NULL, "type" VARCHAR(24) NOT NULL, "quantity" INTEGER NOT NULL,
  "reference" VARCHAR(120), "notes" VARCHAR(500), "recordedBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryMovement_schoolId_createdAt_idx" ON "InventoryMovement"("schoolId", "createdAt" DESC);
CREATE INDEX "InventoryMovement_itemId_createdAt_idx" ON "InventoryMovement"("itemId", "createdAt" DESC);

CREATE TABLE "MaintenanceTicket" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "ticketNo" TEXT NOT NULL, "title" VARCHAR(180) NOT NULL,
  "description" VARCHAR(1500) NOT NULL, "category" VARCHAR(80) NOT NULL, "location" VARCHAR(120), "priority" VARCHAR(24) NOT NULL DEFAULT 'MEDIUM',
  "status" VARCHAR(24) NOT NULL DEFAULT 'OPEN', "assignedTo" VARCHAR(160), "estimatedCost" DECIMAL(12,2), "actualCost" DECIMAL(12,2),
  "dueDate" DATE, "resolvedAt" TIMESTAMP(3), "resolution" VARCHAR(1000), "reportedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaintenanceTicket_schoolId_ticketNo_key" ON "MaintenanceTicket"("schoolId", "ticketNo");
CREATE INDEX "MaintenanceTicket_schoolId_status_priority_createdAt_idx" ON "MaintenanceTicket"("schoolId", "status", "priority", "createdAt" DESC);

ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitorLog" ADD CONSTRAINT "VisitorLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHealthRecord" ADD CONSTRAINT "StudentHealthRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHealthRecord" ADD CONSTRAINT "StudentHealthRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHealthVisit" ADD CONSTRAINT "StudentHealthVisit_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentHealthVisit" ADD CONSTRAINT "StudentHealthVisit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickupAuthorization" ADD CONSTRAINT "PickupAuthorization_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PickupAuthorization" ADD CONSTRAINT "PickupAuthorization_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

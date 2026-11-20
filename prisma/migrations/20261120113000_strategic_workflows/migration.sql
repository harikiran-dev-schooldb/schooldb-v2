CREATE TYPE "StrategicWorkflowType" AS ENUM (
  'LESSON_PLAN',
  'ASSIGNMENT_SUBMISSION',
  'PARENT_TEACHER_MEETING',
  'STUDENT_WELLBEING',
  'TRANSPORT_SAFETY',
  'PROCUREMENT',
  'TIMETABLE_SUBSTITUTION',
  'EARLY_WARNING'
);

CREATE TYPE "StrategicWorkflowStatus" AS ENUM (
  'DRAFT', 'OPEN', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE "StrategicWorkflowPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

CREATE TYPE "StrategicWorkflowEventType" AS ENUM (
  'CREATED', 'UPDATED', 'COMMENT', 'STATUS_CHANGED', 'COMPLETED'
);

CREATE TABLE "StrategicWorkflow" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "type" "StrategicWorkflowType" NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "description" VARCHAR(5000),
  "status" "StrategicWorkflowStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "StrategicWorkflowPriority" NOT NULL DEFAULT 'NORMAL',
  "confidential" BOOLEAN NOT NULL DEFAULT false,
  "ownerUserId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "studentEnrollmentId" TEXT,
  "teacherId" TEXT,
  "startsAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "location" VARCHAR(180),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StrategicWorkflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StrategicWorkflowEvent" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "type" "StrategicWorkflowEventType" NOT NULL,
  "message" VARCHAR(2000),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StrategicWorkflowEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StrategicWorkflow_schoolId_type_status_idx"
  ON "StrategicWorkflow"("schoolId", "type", "status");
CREATE INDEX "StrategicWorkflow_schoolId_ownerUserId_status_idx"
  ON "StrategicWorkflow"("schoolId", "ownerUserId", "status");
CREATE INDEX "StrategicWorkflow_schoolId_studentEnrollmentId_status_idx"
  ON "StrategicWorkflow"("schoolId", "studentEnrollmentId", "status");
CREATE INDEX "StrategicWorkflow_schoolId_dueAt_idx"
  ON "StrategicWorkflow"("schoolId", "dueAt");
CREATE INDEX "StrategicWorkflow_teacherId_status_idx"
  ON "StrategicWorkflow"("teacherId", "status");
CREATE INDEX "StrategicWorkflowEvent_schoolId_workflowId_createdAt_idx"
  ON "StrategicWorkflowEvent"("schoolId", "workflowId", "createdAt");
CREATE INDEX "StrategicWorkflowEvent_schoolId_actorUserId_createdAt_idx"
  ON "StrategicWorkflowEvent"("schoolId", "actorUserId", "createdAt");

ALTER TABLE "StrategicWorkflow"
  ADD CONSTRAINT "StrategicWorkflow_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrategicWorkflow"
  ADD CONSTRAINT "StrategicWorkflow_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StrategicWorkflow"
  ADD CONSTRAINT "StrategicWorkflow_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StrategicWorkflow"
  ADD CONSTRAINT "StrategicWorkflow_studentEnrollmentId_fkey"
  FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StrategicWorkflow"
  ADD CONSTRAINT "StrategicWorkflow_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StrategicWorkflowEvent"
  ADD CONSTRAINT "StrategicWorkflowEvent_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrategicWorkflowEvent"
  ADD CONSTRAINT "StrategicWorkflowEvent_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "StrategicWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrategicWorkflowEvent"
  ADD CONSTRAINT "StrategicWorkflowEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

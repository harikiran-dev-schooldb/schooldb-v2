CREATE TABLE "TransportVehicle" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'BUS',
    "capacity" INTEGER NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL,
    "attendantName" TEXT,
    "attendantPhone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportVehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportRoute" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pickupStart" TEXT,
    "dropStart" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportStop" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "pickupTime" TEXT,
    "dropTime" TEXT,
    "monthlyFee" DECIMAL(12,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportStop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentTransportAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentEnrollmentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dropEnabled" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTransportAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransportVehicle_schoolId_registrationNo_key" ON "TransportVehicle"("schoolId", "registrationNo");
CREATE INDEX "TransportVehicle_schoolId_active_idx" ON "TransportVehicle"("schoolId", "active");
CREATE UNIQUE INDEX "TransportRoute_schoolId_code_key" ON "TransportRoute"("schoolId", "code");
CREATE INDEX "TransportRoute_schoolId_active_idx" ON "TransportRoute"("schoolId", "active");
CREATE INDEX "TransportRoute_vehicleId_idx" ON "TransportRoute"("vehicleId");
CREATE UNIQUE INDEX "TransportStop_routeId_sequence_key" ON "TransportStop"("routeId", "sequence");
CREATE UNIQUE INDEX "TransportStop_routeId_name_key" ON "TransportStop"("routeId", "name");
CREATE INDEX "TransportStop_schoolId_active_idx" ON "TransportStop"("schoolId", "active");
CREATE INDEX "TransportStop_routeId_active_sequence_idx" ON "TransportStop"("routeId", "active", "sequence");
CREATE INDEX "StudentTransportAssignment_schoolId_active_idx" ON "StudentTransportAssignment"("schoolId", "active");
CREATE INDEX "StudentTransportAssignment_studentEnrollmentId_active_idx" ON "StudentTransportAssignment"("studentEnrollmentId", "active");
CREATE INDEX "StudentTransportAssignment_routeId_active_idx" ON "StudentTransportAssignment"("routeId", "active");
CREATE INDEX "StudentTransportAssignment_stopId_idx" ON "StudentTransportAssignment"("stopId");

ALTER TABLE "TransportVehicle" ADD CONSTRAINT "TransportVehicle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TransportStop" ADD CONSTRAINT "TransportStop_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransportStop" ADD CONSTRAINT "TransportStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentTransportAssignment" ADD CONSTRAINT "StudentTransportAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentTransportAssignment" ADD CONSTRAINT "StudentTransportAssignment_studentEnrollmentId_fkey" FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentTransportAssignment" ADD CONSTRAINT "StudentTransportAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentTransportAssignment" ADD CONSTRAINT "StudentTransportAssignment_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "TransportStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

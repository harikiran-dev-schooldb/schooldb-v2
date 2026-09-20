CREATE TABLE "SupportTicketActivity" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportTicketActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportTicketActivity_ticketId_createdAt_idx" ON "SupportTicketActivity"("ticketId", "createdAt");
CREATE INDEX "SupportTicketActivity_schoolId_createdAt_idx" ON "SupportTicketActivity"("schoolId", "createdAt");
ALTER TABLE "SupportTicketActivity" ADD CONSTRAINT "SupportTicketActivity_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketActivity" ADD CONSTRAINT "SupportTicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketActivity" ADD CONSTRAINT "SupportTicketActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Track when each school user last opened a support ticket.
CREATE TABLE "SupportTicketRead" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportTicketRead_ticketId_userId_key"
ON "SupportTicketRead"("ticketId", "userId");

CREATE INDEX "SupportTicketRead_schoolId_userId_readAt_idx"
ON "SupportTicketRead"("schoolId", "userId", "readAt");

CREATE INDEX "SupportTicketRead_userId_readAt_idx"
ON "SupportTicketRead"("userId", "readAt");

ALTER TABLE "SupportTicketRead"
ADD CONSTRAINT "SupportTicketRead_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicketRead"
ADD CONSTRAINT "SupportTicketRead_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicketRead"
ADD CONSTRAINT "SupportTicketRead_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

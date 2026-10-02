CREATE TYPE "SupportTicketComplaintBy" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'STUDENT');

ALTER TABLE "SupportTicket"
ADD COLUMN "complaintBy" "SupportTicketComplaintBy";

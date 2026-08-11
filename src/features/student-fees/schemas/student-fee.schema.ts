import { z } from "zod";

export const studentFeeAssignmentSchema = z.object({
  studentEnrollmentId: z.string().min(1),
  feePlanId: z.string().min(1),
});

export type StudentFeeAssignmentInput =
  z.infer<typeof studentFeeAssignmentSchema>;
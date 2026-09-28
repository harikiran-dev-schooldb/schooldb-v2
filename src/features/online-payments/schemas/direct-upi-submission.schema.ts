import { z } from "zod";

export const directUpiSubmissionSchema = z.object({
  schoolSlug: z.string().trim().min(1),
  studentId: z.string().trim().min(1),
  installmentIds: z.array(z.string().trim().min(1)).min(1).max(50),
  utr: z.string().trim().min(6).max(80),
});

export const directUpiReviewSchema = z.object({
  schoolSlug: z.string().trim().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(500).optional(),
});

export type DirectUpiSubmissionInput = z.infer<
  typeof directUpiSubmissionSchema
>;

export type DirectUpiReviewInput = z.infer<typeof directUpiReviewSchema>;

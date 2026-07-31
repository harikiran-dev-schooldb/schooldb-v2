import { z } from "zod";

export const changeStudentStatusSchema = z.object({
  status: z.enum([
    "ACTIVE",
    "TC_ISSUED",
    "ALUMNI",
    "DROPPED",
    "NOT_COMING",
    "INACTIVE",
  ]),

  remarks: z.string().optional(),
});
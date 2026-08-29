import z from "zod";

export const bulkSchema = z.object({
  mappings: z
    .array(
      z.object({
        academicYear: z.string().min(1),
        className: z.string().min(1),
        subject: z.string().min(1),
        active: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(2000),
});
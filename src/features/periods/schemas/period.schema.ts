import { z } from "zod";

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export const periodSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Period name is required.")
      .max(50),

    startTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Invalid time."
      ),

    endTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Invalid time."
      ),

    displayOrder: z.coerce
      .number()
      .int()
      .min(1, "Display order must be at least 1."),

    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (
      toMinutes(data.endTime) <=
      toMinutes(data.startTime)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message:
          "End time must be after start time.",
      });
    }
  });

export type PeriodFormInput =
  z.input<typeof periodSchema>;

export type PeriodFormOutput =
  z.output<typeof periodSchema>;
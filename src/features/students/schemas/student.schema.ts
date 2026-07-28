import { z } from "zod";

export const studentSchema = z.object({

    admissionNo: z.string().min(1),

    firstName: z.string().min(2),

    lastName: z.string().optional(),

    gender: z.enum(["MALE","FEMALE"]),

    dob: z.date(),

    mobile: z.string().optional(),

    email: z.email().optional()

});

export type StudentSchema = z.infer<typeof studentSchema>;
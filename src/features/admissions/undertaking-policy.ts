import { z } from "zod";
export const undertakingInputSchema=z.object({
 signedBy:z.string().trim().min(2).max(255),
 reference:z.string().trim().min(2).max(150),
 reason:z.string().trim().min(10).max(1000),
 signedDate:z.string().date(),
 confirmed:z.literal(true),
}).strict();
const savedSchema=undertakingInputSchema.extend({
 recordedAt:z.string().datetime(),
 approvedByUserId:z.string().min(1),
 approvedByName:z.string().min(1),
 appliedClassId:z.string().min(1),
 appliedClassName:z.string().min(1),
 academicYearId:z.string().min(1),
 dob:z.string().date(),
 cutoff:z.string().date(),
 completedMonths:z.number().int().nonnegative(),
 minMonths:z.number().int().nonnegative(),
 maxMonths:z.number().int().nonnegative(),
 eligibleClasses:z.array(z.string()),
});
export function readUndertaking(value:unknown){const result=savedSchema.safeParse(value);return result.success?result.data:null;}
export function ageExceptionAllowed(status:string,admin:boolean,confirmed:boolean){return status==="INELIGIBLE"&&admin&&confirmed;}

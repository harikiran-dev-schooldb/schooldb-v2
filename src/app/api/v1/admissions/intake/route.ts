import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { writeAuditLog } from "@/lib/audit";
import { enquirySchema } from "@/features/admissions/intake.schema";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"]);
    if (!hasModuleAccess(actor, "ADMISSIONS", "MANAGE")) throw new ApiError(403, "Admissions management access required.");
    const input = await enquirySchema.parseAsync(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      const [year, cls] = await Promise.all([
        tx.academicYear.findFirst({ where: { id: input.academicYearId, schoolId: actor.schoolId, active: true } }),
        tx.class.findFirst({ where: { id: input.classId, schoolId: actor.schoolId, active: true } }),
      ]);
      if (!year || !cls) throw new ApiError(400, "Choose an active year and class in this school.");
      if (input.dob && input.dob > new Date().toISOString().slice(0,10)) throw new ApiError(400, "Birth date cannot be in the future.");
      const duplicate = await tx.admissionEnquiry.findFirst({ where: {
        schoolId: actor.schoolId, academicYearId: year.id, mobile: input.mobile,
        studentName: { equals: input.studentName, mode: "insensitive" }, state: { in: ["PENDING","OPEN","LINKED"] },
      }, select: { id: true } });
      if (duplicate) throw new ApiError(409, "An enquiry with this student and mobile already exists for the year.");
      const record = await tx.admissionEnquiry.create({ data: { ...input, schoolId: actor.schoolId, dob: input.dob ? new Date(input.dob + "T00:00:00Z") : null } });
      await writeAuditLog(tx, { actor, module: "ADMISSIONS", action: "CREATE", entityType: "ADMISSION_ENQUIRY", entityId: record.id, summary: "Recorded an admission enquiry." });
      return record;
    }, { isolationLevel: "Serializable" });
    return ApiResponse.success(result, "Enquiry recorded.", 201);
  });
}

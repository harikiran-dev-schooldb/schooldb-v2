import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/staff-permissions";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";
import { writeAuditLog } from "@/lib/audit";
import { enquiryActionSchema } from "@/features/admissions/intake.schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const actor = await requireRole(["SUPER_ADMIN","SCHOOL_ADMIN","RECEPTIONIST"]);
    if (!hasModuleAccess(actor, "ADMISSIONS", "MANAGE")) throw new ApiError(403, "Admissions management access required.");
    const { id } = await params;
    const input = await enquiryActionSchema.parseAsync(await request.json());
    await prisma.$transaction(async (tx) => {
      const enquiry = await tx.admissionEnquiry.findFirst({ where: { id, schoolId: actor.schoolId, state: "OPEN" } });
      if (!enquiry) throw new ApiError(404, "Open enquiry not found.");
      let applicationId: string | undefined;
      if (input.action === "LINK") {
        const application = await tx.admissionApplication.findFirst({ where: {
          schoolId: actor.schoolId, applicationNo: input.applicationNo.toUpperCase(),
          academicYearId: enquiry.academicYearId, applyingClassId: enquiry.classId,
          studentName: { equals: enquiry.studentName, mode: "insensitive" },
          ...(enquiry.dob ? { dob: enquiry.dob } : {}),
          OR: [{ fatherPhone: enquiry.mobile }, { motherPhone: enquiry.mobile }, { guardianPhone: enquiry.mobile }],
          enquiry: { is: null },
        }, select: { id: true } });
        if (!application) throw new ApiError(400, "No unlinked matching application in this school, year and class. Verify student name, birth date and mobile.");
        applicationId = application.id;
      }
      const changed = await tx.admissionEnquiry.updateMany({ where: { id, schoolId: actor.schoolId, state: "OPEN" }, data: { state: input.action === "LINK" ? "LINKED" : "CLOSED", ...(applicationId ? { applicationId } : {}) } });
      if (changed.count !== 1) throw new ApiError(409, "Enquiry was already updated.");
      await writeAuditLog(tx, { actor, module: "ADMISSIONS", action: "UPDATE", entityType: "ADMISSION_ENQUIRY", entityId: id, summary: input.action === "LINK" ? "Linked enquiry to a verified application." : "Closed enquiry.", metadata: { ...(applicationId ? { applicationId } : {}) } });
    }, { isolationLevel: "Serializable" });
    return ApiResponse.success(null, input.action === "LINK" ? "Enquiry linked." : "Enquiry closed.");
  });
}

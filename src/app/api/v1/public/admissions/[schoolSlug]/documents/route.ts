import { AdmissionDocumentType } from "@/generated/prisma/enums";
import { trackAdmissionSchema } from "@/features/admissions/admission.schema";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { deleteAdmissionDocumentFile, saveAdmissionDocument } from "@/lib/private-storage";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";
import { requireSchoolSlug } from "@/lib/tenant-context";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ schoolSlug: string }> }) {
  let storageKey: string | null = null;
  try {
    const { schoolSlug: rawSlug } = await params;
    const schoolSlug = requireSchoolSlug(rawSlug);
    const limit = await consumeRateLimit("admission-document", `${schoolSlug}:${requestIp(request) || "unknown"}`, 20, 60 * 60 * 1000);
    if (!limit.allowed) throw new ApiError(429, "Too many uploads. Please try again later.");
    const form = await request.formData();
    const credentials = trackAdmissionSchema.parse({ applicationNo: form.get("applicationNo"), mobile: form.get("mobile") });
    const type = String(form.get("type") || "OTHER");
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Choose a document to upload.");
    if (!Object.values(AdmissionDocumentType).includes(type as AdmissionDocumentType)) throw new ApiError(400, "Choose a valid document type.");

    const application = await prisma.admissionApplication.findFirst({
      where: { applicationNo: credentials.applicationNo, school: { slug: schoolSlug }, OR: [{ fatherPhone: credentials.mobile }, { motherPhone: credentials.mobile }, { guardianPhone: credentials.mobile }] },
      select: { id: true, schoolId: true, status: true },
    });
    if (!application) throw new ApiError(404, "Application number and mobile number do not match.");
    if (["REJECTED", "CONVERTED"].includes(application.status)) throw new ApiError(400, "Documents can no longer be added to this application.");

    storageKey = await saveAdmissionDocument(file);
    const document = await prisma.admissionDocument.create({
      data: { schoolId: application.schoolId, applicationId: application.id, type: type as AdmissionDocumentType, originalName: file.name.slice(0, 255), mimeType: file.type, sizeBytes: file.size, storageKey },
      select: { id: true, type: true, originalName: true, createdAt: true },
    });
    return Response.json({ success: true, data: document, message: "Document uploaded securely." }, { status: 201 });
  } catch (error) {
    if (storageKey) await deleteAdmissionDocumentFile(storageKey);
    const status = error instanceof ApiError ? error.status : 400;
    return Response.json({ success: false, message: error instanceof Error ? error.message : "Unable to upload document." }, { status });
  }
}

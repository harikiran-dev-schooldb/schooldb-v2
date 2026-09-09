import { ApiError } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readAdmissionDocument } from "@/lib/private-storage";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    const actor = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"]);
    const { id, documentId } = await params;
    const document = await prisma.admissionDocument.findFirst({ where: { id: documentId, applicationId: id, schoolId: actor.schoolId }, select: { storageKey: true, originalName: true, mimeType: true } });
    if (!document) throw new ApiError(404, "Document not found.");
    const file = await readAdmissionDocument(document.storageKey);
    return new Response(file, { headers: { "Content-Type": document.mimeType, "Content-Disposition": `inline; filename="${document.originalName.replace(/["\r\n]/g, "_")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return Response.json({ success: false, message: error instanceof Error ? error.message : "Unable to open document." }, { status });
  }
}

import { apiErrorResponse } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { deleteStudentDocumentFile } from "@/lib/private-storage";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string; documentId: string }> };

export async function PATCH(request: Request, { params }: Props) {
  try {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"]);
    const { id: studentId, documentId } = await params;
    const body = await request.json();
    if (typeof body.visibleToFamily !== "boolean") {
      throw new ApiError(400, "Family visibility is required");
    }

    const document = await prisma.studentDocument.findFirst({
      where: { id: documentId, studentId, schoolId: tenant.schoolId },
      select: { id: true, name: true, visibleToFamily: true },
    });
    if (!document) throw new ApiError(404, "Document not found");
    await prisma.$transaction([
      prisma.studentDocument.update({ where: { id: documentId }, data: { visibleToFamily: body.visibleToFamily } }),
      prisma.studentActivity.create({ data: {
        schoolId: tenant.schoolId, studentId, performedByUserId: tenant.userId,
        type: "DOCUMENT_UPDATED", title: "Document visibility updated",
        description: `${document.name} is now ${body.visibleToFamily ? "visible" : "hidden"} to the family.`,
        sourceType: "DOCUMENT_UPDATE", sourceId: `${documentId}:${Date.now()}`,
        metadata: { documentId, visibleToFamily: body.visibleToFamily },
      } }),
    ]);
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update document.");
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  try {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"]);
    const { id: studentId, documentId } = await params;
    const document = await prisma.studentDocument.findFirst({
      where: { id: documentId, studentId, schoolId: tenant.schoolId },
      select: { id: true, name: true, storageKey: true },
    });
    if (!document) throw new ApiError(404, "Document not found");

    await prisma.$transaction([
      prisma.studentDocument.delete({ where: { id: document.id } }),
      prisma.studentActivity.create({
        data: {
          schoolId: tenant.schoolId,
          studentId,
          performedByUserId: tenant.userId,
          type: "DOCUMENT_DELETED",
          title: "Document deleted",
          description: document.name,
          metadata: { documentId },
        },
      }),
    ]);
    await deleteStudentDocumentFile(document.storageKey);
    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to delete document.");
  }
}

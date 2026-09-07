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

    const result = await prisma.studentDocument.updateMany({
      where: { id: documentId, studentId, schoolId: tenant.schoolId },
      data: { visibleToFamily: body.visibleToFamily },
    });
    if (result.count === 0) throw new ApiError(404, "Document not found");
    return Response.json({ success: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return Response.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to update document" },
      { status },
    );
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
    const status = error instanceof ApiError ? error.status : 500;
    return Response.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to delete document" },
      { status },
    );
  }
}

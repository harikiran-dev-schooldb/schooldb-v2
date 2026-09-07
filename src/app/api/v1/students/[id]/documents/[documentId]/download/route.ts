import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { readStudentDocument } from "@/lib/private-storage";
import { requireStudentDocumentAccess } from "@/features/students/student-document-access";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string; documentId: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    const { id: studentId, documentId } = await params;
    const { membership, familyOnly } = await requireStudentDocumentAccess(studentId);
    const document = await prisma.studentDocument.findFirst({
      where: {
        id: documentId,
        studentId,
        schoolId: membership.schoolId,
        ...(familyOnly ? { visibleToFamily: true } : {}),
      },
      select: { storageKey: true, originalName: true, mimeType: true },
    });
    if (!document) throw new ApiError(404, "Document not found");

    const file = await readStudentDocument(document.storageKey);
    const safeName = document.originalName.replace(/["\r\n]/g, "_");
    return new Response(file, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return Response.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to open document" },
      { status },
    );
  }
}

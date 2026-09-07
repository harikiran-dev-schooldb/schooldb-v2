import { StudentDocumentType } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  deleteStudentDocumentFile,
  saveStudentDocument,
} from "@/lib/private-storage";
import { requireStudentDocumentAccess } from "@/features/students/student-document-access";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    const { id: studentId } = await params;
    const { membership, familyOnly } = await requireStudentDocumentAccess(studentId);
    const documents = await prisma.studentDocument.findMany({
      where: {
        studentId,
        schoolId: membership.schoolId,
        ...(familyOnly ? { visibleToFamily: true } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        name: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        notes: true,
        visibleToFamily: true,
        createdAt: true,
      },
    });
    return Response.json({ success: true, data: documents });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return Response.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to load documents" },
      { status },
    );
  }
}

export async function POST(request: Request, { params }: Props) {
  let storageKey: string | null = null;
  try {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN", "RECEPTIONIST"]);
    const { id: studentId } = await params;
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: tenant.schoolId },
      select: { id: true },
    });
    if (!student) throw new ApiError(404, "Student not found");

    const form = await request.formData();
    const file = form.get("file");
    const typeValue = String(form.get("type") || "OTHER");
    const name = String(form.get("name") || "").trim();
    const notes = String(form.get("notes") || "").trim();
    const visibleToFamily = form.get("visibleToFamily") === "true";

    if (!(file instanceof File)) throw new ApiError(400, "Choose a document to upload");
    if (!Object.values(StudentDocumentType).includes(typeValue as StudentDocumentType)) {
      throw new ApiError(400, "Choose a valid document type");
    }
    if (!name || name.length > 120) throw new ApiError(400, "Enter a document name");
    if (notes.length > 500) throw new ApiError(400, "Notes cannot exceed 500 characters");

    try {
      storageKey = await saveStudentDocument(file);
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : "Invalid document");
    }

    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.studentDocument.create({
        data: {
          schoolId: tenant.schoolId,
          studentId,
          type: typeValue as StudentDocumentType,
          name,
          originalName: file.name.slice(0, 255) || name,
          mimeType: file.type,
          sizeBytes: file.size,
          storageKey: storageKey!,
          notes: notes || null,
          visibleToFamily,
          uploadedBy: tenant.userId,
        },
        select: { id: true },
      });
      await tx.studentActivity.create({
        data: {
          schoolId: tenant.schoolId,
          studentId,
          type: "DOCUMENT_UPLOADED",
          title: "Document uploaded",
          description: name,
          metadata: { documentId: created.id, documentType: typeValue },
        },
      });
      return created;
    });

    return Response.json({ success: true, data: document }, { status: 201 });
  } catch (error) {
    if (storageKey) await deleteStudentDocumentFile(storageKey);
    const status = error instanceof ApiError ? error.status : 500;
    return Response.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to upload document" },
      { status },
    );
  }
}

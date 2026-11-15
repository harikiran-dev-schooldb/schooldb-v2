import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { recordAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

type ImportMetadata = { kind?: string; createdIds?: string[]; created?: number; rollbackAvailable?: boolean };

export async function GET() {
  return apiHandler(async () => {
    const member = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const [imports, rollbacks] = await Promise.all([
      prisma.auditLog.findMany({ where: { schoolId: member.schoolId, action: "IMPORT", module: "SYSTEM", metadata: { path: ["bulkAdmin"], equals: true } }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, entityType: true, summary: true, metadata: true, actorName: true, createdAt: true } }),
      prisma.auditLog.findMany({ where: { schoolId: member.schoolId, action: "DELETE", module: "SYSTEM", metadata: { path: ["bulkRollback"], equals: true } }, select: { entityId: true } }),
    ]);
    const rolledBack = new Set(rollbacks.map((r) => r.entityId));
    return ApiResponse.success(imports.map((item) => ({ ...item, rollbackAvailable: !rolledBack.has(item.id) && Boolean((item.metadata as ImportMetadata | null)?.rollbackAvailable) })));
  });
}

export async function DELETE(request: Request) {
  return apiHandler(async () => {
    const member = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]); const { auditId } = z.object({ auditId: z.string().min(1) }).parse(await request.json());
    const [entry, prior] = await Promise.all([
      prisma.auditLog.findFirst({ where: { id: auditId, schoolId: member.schoolId, action: "IMPORT", module: "SYSTEM" } }),
      prisma.auditLog.findFirst({ where: { schoolId: member.schoolId, action: "DELETE", module: "SYSTEM", entityId: auditId } }),
    ]);
    if (!entry) return ApiResponse.error("Import history item not found.", 404); if (prior) return ApiResponse.error("This import was already rolled back.", 409);
    const metadata = entry.metadata as ImportMetadata | null; const ids = metadata?.createdIds?.filter((id) => typeof id === "string") ?? []; const kind = metadata?.kind ?? entry.entityType;
    if (!ids.length || !metadata?.rollbackAvailable) return ApiResponse.error("This import cannot be safely rolled back.", 409);
    const where = { id: { in: ids }, schoolId: member.schoolId };
    const deleted = await prisma.$transaction(async (tx) => {
      if (kind === "inventory") return (await tx.inventoryItem.deleteMany({ where })).count;
      if (kind === "expenses") return (await tx.expense.deleteMany({ where })).count;
      if (kind === "calendar") return (await tx.schoolCalendarEvent.deleteMany({ where })).count;
      if (kind === "parent-links") return (await tx.parentStudentLink.deleteMany({ where })).count;
      if (kind === "salary-structures") return (await tx.salaryStructure.deleteMany({ where })).count;
      return 0;
    });
    await recordAuditLog({ actor: member, module: "SYSTEM", action: "DELETE", entityType: kind, entityId: auditId, summary: `Rolled back ${deleted} records from bulk import.`, metadata: { importId: auditId, deleted, bulkRollback: true } });
    return ApiResponse.success({ deleted }, `${deleted} imported records removed.`);
  });
}

import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"] as const;
type Row = { name?: unknown; code?: unknown; color?: unknown; description?: unknown; displayOrder?: unknown; active?: unknown };

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([...ADMIN_ROLES]);
    const body = await req.json();
    const rows: Row[] = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length || rows.length > 200) return ApiResponse.error("Provide between 1 and 200 house rows.", 400);

    const normalized = rows.map((row, index) => ({
      row: index + 1,
      name: String(row.name ?? "").trim(),
      code: String(row.code ?? "").trim().toUpperCase() || null,
      color: String(row.color ?? "").trim() || null,
      description: String(row.description ?? "").trim() || null,
      displayOrder: Number.isFinite(Number(row.displayOrder)) ? Number(row.displayOrder) : 0,
      active: row.active === undefined ? true : ["TRUE","YES","1","ACTIVE"].includes(String(row.active).trim().toUpperCase()),
    }));
    const invalid = normalized.filter(r => !r.name);
    if (invalid.length) return ApiResponse.error(`House name is required on row(s): ${invalid.map(r=>r.row).join(", ")}.`, 400);

    const names = normalized.map(r=>r.name.toLowerCase());
    if (new Set(names).size !== names.length) return ApiResponse.error("Duplicate house names exist in the import.", 400);

    const existing = await prisma.house.findMany({ where: { schoolId: tenant.schoolId }, select: { id:true, name:true, code:true } });
    const byName = new Map(existing.map(h=>[h.name.toLowerCase(),h]));
    const byCode = new Map(existing.filter(h=>h.code).map(h=>[h.code!,h]));
    let created=0, updated=0;

    await prisma.$transaction(normalized.map(row => {
      const match = byName.get(row.name.toLowerCase()) || (row.code ? byCode.get(row.code) : undefined);
      if (match) { updated++; return prisma.house.update({ where:{id:match.id}, data:{name:row.name,code:row.code,color:row.color,description:row.description,displayOrder:row.displayOrder,active:row.active} }); }
      created++; return prisma.house.create({ data:{schoolId:tenant.schoolId,name:row.name,code:row.code,color:row.color,description:row.description,displayOrder:row.displayOrder,active:row.active} });
    }));

    return ApiResponse.success({created,updated,total:normalized.length}, `${created} house(s) created and ${updated} updated.`);
  });
}

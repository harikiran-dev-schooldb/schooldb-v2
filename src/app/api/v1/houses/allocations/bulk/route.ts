import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN"] as const;
type Row = { academicYear?: unknown; admissionNo?: unknown; houseCode?: unknown };

export async function POST(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole([...ADMIN_ROLES]);
    const body = await req.json();
    const rows: Row[] = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length || rows.length > 5000) return ApiResponse.error("Provide between 1 and 5000 allocation rows.", 400);

    const normalized = rows.map((row,index)=>({
      row:index+1,
      academicYear:String(row.academicYear??"").trim(),
      admissionNo:String(row.admissionNo??"").trim(),
      houseCode:String(row.houseCode??"").trim().toUpperCase(),
    }));
    const missing=normalized.filter(r=>!r.academicYear||!r.admissionNo||!r.houseCode);
    if(missing.length)return ApiResponse.error(`Required data missing on row(s): ${missing.slice(0,20).map(r=>r.row).join(", ")}.`,400);

    const years=await prisma.academicYear.findMany({where:{schoolId:tenant.schoolId},select:{id:true,name:true}});
    const houses=await prisma.house.findMany({where:{schoolId:tenant.schoolId},select:{id:true,code:true}});
    const yearMap=new Map(years.map(y=>[y.name.toLowerCase(),y.id]));
    const houseCodeMap=new Map(houses.filter(h=>h.code).map(h=>[h.code!,h.id]));

    const admissionNos=[...new Set(normalized.map(r=>r.admissionNo))];
    const students=await prisma.student.findMany({where:{schoolId:tenant.schoolId,admissionNo:{in:admissionNos}},select:{id:true,admissionNo:true}});
    const studentMap=new Map(students.map(s=>[s.admissionNo,s.id]));

    const errors:string[]=[];
    const resolved:{row:number;academicYearId:string;studentId:string;houseId:string}[]=[];
    for(const row of normalized){
      const academicYearId=yearMap.get(row.academicYear.toLowerCase());
      const studentId=studentMap.get(row.admissionNo);
      const houseId=houseCodeMap.get(row.houseCode);
      if(!academicYearId)errors.push(`Row ${row.row}: academic year "${row.academicYear}" not found.`);
      else if(!studentId)errors.push(`Row ${row.row}: admission no "${row.admissionNo}" not found.`);
      else if(!houseId)errors.push(`Row ${row.row}: house code "${row.houseCode}" not found.`);
      else resolved.push({row:row.row,academicYearId,studentId,houseId});
    }
    if(errors.length)return ApiResponse.error(errors.slice(0,30).join(" "),400);

    const duplicateKeys=resolved.map(r=>`${r.academicYearId}:${r.studentId}`);
    if(new Set(duplicateKeys).size!==duplicateKeys.length)return ApiResponse.error("The same student appears more than once for an academic year.",400);

    const enrollments=await prisma.studentEnrollment.findMany({
      where:{schoolId:tenant.schoolId,OR:resolved.map(r=>({academicYearId:r.academicYearId,studentId:r.studentId}))},
      select:{id:true,academicYearId:true,studentId:true},
    });
    const enrollmentMap=new Map(enrollments.map(e=>[`${e.academicYearId}:${e.studentId}`,e.id]));
    const missingEnrollments=resolved.filter(r=>!enrollmentMap.has(`${r.academicYearId}:${r.studentId}`));
    if(missingEnrollments.length)return ApiResponse.error(`No enrollment found for row(s): ${missingEnrollments.slice(0,30).map(r=>r.row).join(", ")}.`,400);

    const enrollmentIds=resolved.map(r=>enrollmentMap.get(`${r.academicYearId}:${r.studentId}`)!);
    const existing=await prisma.studentHouse.findMany({where:{studentEnrollmentId:{in:enrollmentIds}},select:{studentEnrollmentId:true}});
    const existingSet=new Set(existing.map(x=>x.studentEnrollmentId));
    let created=0,updated=0;

    const operations=resolved.map(row=>{
      const studentEnrollmentId=enrollmentMap.get(`${row.academicYearId}:${row.studentId}`)!;
      if(existingSet.has(studentEnrollmentId))updated++;else created++;
      return prisma.studentHouse.upsert({
        where:{studentEnrollmentId},
        create:{schoolId:tenant.schoolId,academicYearId:row.academicYearId,studentId:row.studentId,studentEnrollmentId,houseId:row.houseId},
        update:{houseId:row.houseId},
      });
    });
    for(let i=0;i<operations.length;i+=100)await prisma.$transaction(operations.slice(i,i+100));
    return ApiResponse.success({created,updated,total:resolved.length},`${created} allocation(s) created and ${updated} updated.`);
  });
}

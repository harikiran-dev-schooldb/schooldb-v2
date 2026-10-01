import { z } from "zod";

import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { runSerializableTransaction } from "@/lib/prisma-transaction";
import { ApiResponse } from "@/lib/response";
import { validateBody } from "@/lib/validation";

const SOURCE_SCHOOL_SLUG = "demo";

const copySchoolSetupSchema = z.object({
  academicYearId: z.string().min(1, "Academic year is required."),
  copySubjects: z.boolean(),
});

type CopyCounts = {
  syllabi: number;
  branches: number;
  classes: number;
  sections: number;
  subjects: number;
  classSubjects: number;
};

function emptyCounts(): CopyCounts {
  return {
    syllabi: 0,
    branches: 0,
    classes: 0,
    sections: 0,
    subjects: 0,
    classSubjects: 0,
  };
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const input = await validateBody(request, copySchoolSetupSchema);

    if (tenant.school.slug === SOURCE_SCHOOL_SLUG) {
      throw new ApiError(400, "The demo school cannot be copied into itself.");
    }

    const [sourceSchool, targetAcademicYear] = await Promise.all([
      prisma.school.findUnique({
        where: { slug: SOURCE_SCHOOL_SLUG },
        select: { id: true, name: true, slug: true },
      }),
      prisma.academicYear.findFirst({
        where: {
          id: input.academicYearId,
          schoolId: tenant.schoolId,
        },
        select: { id: true, name: true },
      }),
    ]);

    if (!sourceSchool) {
      throw new ApiError(404, 'Source school "demo" was not found.');
    }

    if (!targetAcademicYear) {
      throw new ApiError(404, "Selected academic year was not found for this school.");
    }

    const sourceAcademicYear = input.copySubjects
      ? await prisma.academicYear.findFirst({
          where: {
            schoolId: sourceSchool.id,
            name: targetAcademicYear.name,
          },
          select: { id: true, name: true },
        })
      : null;

    if (input.copySubjects && !sourceAcademicYear) {
      throw new ApiError(
        400,
        `The demo school does not have academic year "${targetAcademicYear.name}". Create the matching demo academic year or choose No for subjects.`,
      );
    }

    const result = await runSerializableTransaction(async (tx) => {
      const created = emptyCounts();
      const reused = emptyCounts();

      const classIdMap = new Map<string, string>();
      const subjectIdMap = new Map<string, string>();

      const sourceSyllabi = await tx.syllabus.findMany({
        where: { schoolId: sourceSchool.id },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: {
          branches: {
            orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
            include: {
              classes: {
                orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
                include: {
                  sections: {
                    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
                  },
                },
              },
            },
          },
        },
      });

      for (const sourceSyllabus of sourceSyllabi) {
        const existingSyllabus = await tx.syllabus.findUnique({
          where: {
            schoolId_name: {
              schoolId: tenant.schoolId,
              name: sourceSyllabus.name,
            },
          },
          select: { id: true },
        });

        const targetSyllabus =
          existingSyllabus ??
          (await tx.syllabus.create({
            data: {
              schoolId: tenant.schoolId,
              name: sourceSyllabus.name,
              code: sourceSyllabus.code,
              description: sourceSyllabus.description,
              displayOrder: sourceSyllabus.displayOrder,
              active: sourceSyllabus.active,
            },
            select: { id: true },
          }));

        if (existingSyllabus) reused.syllabi += 1;
        else created.syllabi += 1;

        for (const sourceBranch of sourceSyllabus.branches) {
          const existingBranch = await tx.academicBranch.findUnique({
            where: {
              syllabusId_name: {
                syllabusId: targetSyllabus.id,
                name: sourceBranch.name,
              },
            },
            select: { id: true },
          });

          const targetBranch =
            existingBranch ??
            (await tx.academicBranch.create({
              data: {
                schoolId: tenant.schoolId,
                syllabusId: targetSyllabus.id,
                name: sourceBranch.name,
                code: sourceBranch.code,
                description: sourceBranch.description,
                displayOrder: sourceBranch.displayOrder,
                active: sourceBranch.active,
              },
              select: { id: true },
            }));

          if (existingBranch) reused.branches += 1;
          else created.branches += 1;

          for (const sourceClass of sourceBranch.classes) {
            const existingClass = await tx.class.findUnique({
              where: {
                branchId_name: {
                  branchId: targetBranch.id,
                  name: sourceClass.name,
                },
              },
              select: { id: true },
            });

            const targetClass =
              existingClass ??
              (await tx.class.create({
                data: {
                  schoolId: tenant.schoolId,
                  branchId: targetBranch.id,
                  name: sourceClass.name,
                  code: sourceClass.code,
                  description: sourceClass.description,
                  displayOrder: sourceClass.displayOrder,
                  active: sourceClass.active,
                },
                select: { id: true },
              }));

            classIdMap.set(sourceClass.id, targetClass.id);

            if (existingClass) reused.classes += 1;
            else created.classes += 1;

            for (const sourceSection of sourceClass.sections) {
              const existingSection = await tx.section.findUnique({
                where: {
                  classId_name: {
                    classId: targetClass.id,
                    name: sourceSection.name,
                  },
                },
                select: { id: true },
              });

              if (existingSection) {
                reused.sections += 1;
              } else {
                await tx.section.create({
                  data: {
                    classId: targetClass.id,
                    name: sourceSection.name,
                    displayOrder: sourceSection.displayOrder,
                    active: sourceSection.active,
                  },
                });
                created.sections += 1;
              }
            }
          }
        }
      }

      if (input.copySubjects && sourceAcademicYear) {
        const sourceSubjects = await tx.subject.findMany({
          where: { schoolId: sourceSchool.id },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        });

        for (const sourceSubject of sourceSubjects) {
          const existingSubject = await tx.subject.findUnique({
            where: {
              schoolId_name: {
                schoolId: tenant.schoolId,
                name: sourceSubject.name,
              },
            },
            select: { id: true },
          });

          const targetSubject =
            existingSubject ??
            (await tx.subject.create({
              data: {
                schoolId: tenant.schoolId,
                name: sourceSubject.name,
                code: sourceSubject.code,
                type: sourceSubject.type,
                displayOrder: sourceSubject.displayOrder,
                active: sourceSubject.active,
              },
              select: { id: true },
            }));

          subjectIdMap.set(sourceSubject.id, targetSubject.id);

          if (existingSubject) reused.subjects += 1;
          else created.subjects += 1;
        }

        const sourceClassSubjects = await tx.classSubject.findMany({
          where: {
            schoolId: sourceSchool.id,
            academicYearId: sourceAcademicYear.id,
          },
          select: {
            classId: true,
            subjectId: true,
            active: true,
          },
        });

        for (const sourceClassSubject of sourceClassSubjects) {
          const targetClassId = classIdMap.get(sourceClassSubject.classId);
          const targetSubjectId = subjectIdMap.get(sourceClassSubject.subjectId);

          if (!targetClassId || !targetSubjectId) {
            throw new ApiError(
              400,
              "A demo class-subject mapping references a class or subject that could not be copied.",
            );
          }

          const existingClassSubject = await tx.classSubject.findUnique({
            where: {
              academicYearId_classId_subjectId: {
                academicYearId: targetAcademicYear.id,
                classId: targetClassId,
                subjectId: targetSubjectId,
              },
            },
            select: { id: true },
          });

          if (existingClassSubject) {
            reused.classSubjects += 1;
          } else {
            await tx.classSubject.create({
              data: {
                schoolId: tenant.schoolId,
                academicYearId: targetAcademicYear.id,
                classId: targetClassId,
                subjectId: targetSubjectId,
                active: sourceClassSubject.active,
              },
            });
            created.classSubjects += 1;
          }
        }
      }

      return { created, reused };
    });

    return ApiResponse.success(
      {
        sourceSchool: {
          slug: sourceSchool.slug,
          name: sourceSchool.name,
          academicYear: sourceAcademicYear?.name ?? null,
        },
        targetSchool: {
          slug: tenant.school.slug,
          name: tenant.school.name,
          academicYear: targetAcademicYear.name,
        },
        copySubjects: input.copySubjects,
        ...result,
      },
      input.copySubjects
        ? "School setup and subjects copied successfully."
        : "School setup copied successfully without subjects.",
    );
  });
}

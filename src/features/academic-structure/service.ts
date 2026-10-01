import { prisma } from "@/lib/prisma";

import type { AcademicBranchInput, SyllabusInput } from "./schemas";

export const academicStructureService = {
  listSyllabi(schoolId: string) {
    return prisma.syllabus.findMany({
      where: { schoolId, active: true },
      include: { _count: { select: { branches: true } } },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
  },

  syllabusOptions(schoolId: string) {
    return prisma.syllabus.findMany({
      where: { schoolId, active: true },
      select: { id: true, name: true, code: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
  },

  async getSyllabus(id: string, schoolId: string) {
    const item = await prisma.syllabus.findFirst({ where: { id, schoolId } });
    if (!item) throw new Error("Syllabus not found.");
    return item;
  },

  async createSyllabus(schoolId: string, input: SyllabusInput) {
    const duplicate = await prisma.syllabus.findFirst({
      where: { schoolId, name: { equals: input.name, mode: "insensitive" } },
    });
    if (duplicate) throw new Error("Syllabus already exists.");
    return prisma.syllabus.create({ data: { ...input, schoolId } });
  },

  async updateSyllabus(id: string, schoolId: string, input: SyllabusInput) {
    await this.getSyllabus(id, schoolId);
    const duplicate = await prisma.syllabus.findFirst({
      where: {
        schoolId,
        id: { not: id },
        name: { equals: input.name, mode: "insensitive" },
      },
    });
    if (duplicate) throw new Error("Syllabus already exists.");
    return prisma.syllabus.update({ where: { id, schoolId }, data: input });
  },

  listBranches(schoolId: string, syllabusId?: string) {
    return prisma.academicBranch.findMany({
      where: { schoolId, active: true, ...(syllabusId ? { syllabusId } : {}) },
      include: {
        syllabus: { select: { id: true, name: true } },
        _count: { select: { classes: true } },
      },
      orderBy: [
        { syllabus: { displayOrder: "asc" } },
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    });
  },

  branchOptions(schoolId: string, syllabusId: string) {
    return prisma.academicBranch.findMany({
      where: { schoolId, syllabusId, active: true },
      select: { id: true, name: true, code: true, syllabusId: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
  },

  async getBranch(id: string, schoolId: string) {
    const item = await prisma.academicBranch.findFirst({
      where: { id, schoolId },
      include: { syllabus: { select: { id: true, name: true } } },
    });
    if (!item) throw new Error("Academic branch not found.");
    return item;
  },

  async createBranch(schoolId: string, input: AcademicBranchInput) {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id: input.syllabusId, schoolId, active: true },
    });
    if (!syllabus) throw new Error("Syllabus not found.");
    const duplicate = await prisma.academicBranch.findFirst({
      where: {
        syllabusId: input.syllabusId,
        name: { equals: input.name, mode: "insensitive" },
      },
    });
    if (duplicate) throw new Error("Branch already exists in this syllabus.");
    return prisma.academicBranch.create({ data: { ...input, schoolId } });
  },

  async updateBranch(id: string, schoolId: string, input: AcademicBranchInput) {
    await this.getBranch(id, schoolId);
    const syllabus = await prisma.syllabus.findFirst({
      where: { id: input.syllabusId, schoolId, active: true },
    });
    if (!syllabus) throw new Error("Syllabus not found.");
    const duplicate = await prisma.academicBranch.findFirst({
      where: {
        id: { not: id },
        syllabusId: input.syllabusId,
        name: { equals: input.name, mode: "insensitive" },
      },
    });
    if (duplicate) throw new Error("Branch already exists in this syllabus.");
    return prisma.academicBranch.update({
      where: { id, schoolId },
      data: input,
    });
  },
};

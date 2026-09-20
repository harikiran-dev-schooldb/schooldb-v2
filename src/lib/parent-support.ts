import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";

export const parentCategories = ["STUDENT", "ACADEMIC", "FEES", "TRANSPORT", "GENERAL"] as const;

export async function parentSupportSchool(schoolSlug: string) {
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: {
      id: true,
      name: true,
      classes: {
        where: { active: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          sections: {
            where: { active: true },
            orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true },
          },
        },
      },
    },
  });
  if (!school) throw new ApiError(404, "School not found.");
  return school;
}

export async function searchParentSupportStudents(input: {
  schoolSlug: string;
  classId: string;
  sectionId: string;
  query: string;
}) {
  const school = await prisma.school.findUnique({
    where: { slug: input.schoolSlug }, select: { id: true },
  });
  if (!school) throw new ApiError(404, "School not found.");

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      schoolId: school.id,
      classId: input.classId,
      sectionId: input.sectionId,
      active: true,
      academicYear: { active: true },
      class: { active: true },
      section: { active: true },
      student: {
        OR: [
          { fullName: { contains: input.query, mode: "insensitive" } },
          { admissionNo: { equals: input.query, mode: "insensitive" } },
        ],
      },
    },
    select: { student: { select: { id: true, fullName: true, admissionNo: true } } },
    take: 10,
    orderBy: { student: { fullName: "asc" } },
  });
  return enrollments.map(({ student }) => ({
    id: student.id,
    name: student.fullName || "Student",
    admissionHint: student.admissionNo.slice(-4),
  }));
}

export async function submitParentSupport(input: {
  schoolSlug: string;
  classId: string;
  sectionId: string;
  studentId: string;
  category: typeof parentCategories[number];
  subject: string;
  description: string;
  parentName?: string;
  parentPhone?: string;
}) {
  const school = await prisma.school.findUnique({
    where: { slug: input.schoolSlug }, select: { id: true },
  });
  if (!school) throw new ApiError(404, "School not found.");

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      schoolId: school.id,
      classId: input.classId,
      sectionId: input.sectionId,
      studentId: input.studentId,
      active: true,
      academicYear: { active: true },
      class: { active: true },
      section: { active: true },
    },
    select: { id: true },
  });
  if (!enrollment) throw new ApiError(400, "Choose a student in the selected class and section.");

  const ticket = await prisma.supportTicket.create({
    data: {
      schoolId: school.id,
      ticketNo: `TCK-${randomUUID().slice(0, 12).toUpperCase()}`,
      subject: input.subject,
      description: input.description,
      type: input.category,
      studentId: input.studentId,
      source: "PARENT_QR",
      parentName: input.parentName || null,
      parentPhone: input.parentPhone || null,
    },
    select: { id: true, ticketNo: true },
  });

  try {
    await sendSupportPush({
      schoolId: school.id,
      userIds: await supportAdminUserIds(school.id),
      title: "New parent query",
      body: `${ticket.ticketNo} · ${input.subject}`,
      ticketId: ticket.id,
      ticketNo: ticket.ticketNo,
    });
  } catch (error) {
    console.error("Parent support push failed", error);
  }
  return ticket;
}

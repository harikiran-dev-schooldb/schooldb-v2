import { randomUUID } from "node:crypto";

import { normalizeIndianMobile } from "@/features/auth/otp";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";
import { queueParentQueryWhatsappUpdate } from "@/features/whatsapp/service";

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
  admissionNo: string;
  mobile: string;
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
      active: true,
      academicYear: { active: true },
      class: { active: true },
      section: { active: true },
      student: {
        admissionNo: { equals: input.admissionNo, mode: "insensitive" },
      },
    },
    select: {
      student: {
        select: {
          id: true,
          fullName: true,
          admissionNo: true,
          phone: true,
          fatherPhone: true,
          motherPhone: true,
          guardianPhone: true,
        },
      },
    },
  });
  if (!enrollment) return [];
  const { student } = enrollment;
  const verified = [
    student.phone,
    student.fatherPhone,
    student.motherPhone,
    student.guardianPhone,
  ].some((phone) => normalizeIndianMobile(phone || "") === input.mobile);
  if (!verified) return [];
  return [{
    id: student.id,
    name: student.fullName || "Student",
    admissionHint: student.admissionNo.slice(-4),
  }];
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
  parentPhone: string;
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
    select: {
      id: true,
      student: {
        select: {
          phone: true,
          fatherPhone: true,
          motherPhone: true,
          guardianPhone: true,
        },
      },
    },
  });
  const verifiedPhone = enrollment && [
    enrollment.student.phone,
    enrollment.student.fatherPhone,
    enrollment.student.motherPhone,
    enrollment.student.guardianPhone,
  ].some((phone) => normalizeIndianMobile(phone || "") === input.parentPhone);
  if (!enrollment || !verifiedPhone) {
    throw new ApiError(
      400,
      "The student details and registered mobile number could not be verified.",
    );
  }

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
  await queueParentQueryWhatsappUpdate({
      schoolId: school.id,
      ticketId: ticket.id,
      ticketNo: ticket.ticketNo,
      phone: input.parentPhone,
      parentName: input.parentName || null,
      status: "OPEN",
      eventKey: "created",
  }).catch((error) => console.error("Parent query WhatsApp failed", error));
  return ticket;
}

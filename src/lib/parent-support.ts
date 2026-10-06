import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { normalizeIndianMobile } from "@/features/auth/otp";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/errors";
import { sendSupportPush, supportAdminUserIds } from "@/lib/support-push";
import { queueParentQueryWhatsappUpdate } from "@/features/whatsapp/service";

export const parentCategories = ["STUDENT", "ACADEMIC", "FEES", "TRANSPORT", "GENERAL"] as const;
export const complaintByOptions = ["FATHER", "MOTHER", "GUARDIAN", "STUDENT", "OTHER"] as const;

export async function parentSupportSchool(schoolSlug: string) {
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: {
      id: true,
      name: true,
    },
  });
  if (!school) throw new ApiError(404, "School not found.");
  return school;
}

export async function searchParentSupportStudents(input: {
  schoolSlug: string;
  mobile: string;
}) {
  const school = await prisma.school.findUnique({
    where: { slug: input.schoolSlug }, select: { id: true },
  });
  if (!school) throw new ApiError(404, "School not found.");

  const matches = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT s.id
    FROM "Student" s
    WHERE s."schoolId" = ${school.id}
      AND s.status = 'ACTIVE'
      AND (
        RIGHT(regexp_replace(COALESCE(s.phone, ''), '[^0-9]', '', 'g'), 10) = ${input.mobile}
        OR RIGHT(regexp_replace(COALESCE(s."fatherPhone", ''), '[^0-9]', '', 'g'), 10) = ${input.mobile}
        OR RIGHT(regexp_replace(COALESCE(s."motherPhone", ''), '[^0-9]', '', 'g'), 10) = ${input.mobile}
        OR RIGHT(regexp_replace(COALESCE(s."guardianPhone", ''), '[^0-9]', '', 'g'), 10) = ${input.mobile}
      )
  `);
  if (matches.length === 0) return [];

  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      id: { in: matches.map((match) => match.id) },
      status: "ACTIVE",
      enrollments: {
        some: {
          active: true,
          academicYear: { active: true },
          class: { active: true },
          section: { active: true },
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      admissionNo: true,
      fatherName: true,
      motherName: true,
      guardianName: true,
    },
    orderBy: [{ fullName: "asc" }, { admissionNo: "asc" }],
  });

  return students.map((student) => ({
    id: student.id,
    name: student.fullName || "Student",
    admissionHint: student.admissionNo.slice(-4),
    fatherName: student.fatherName,
    motherName: student.motherName,
    guardianName: student.guardianName,
  }));
}

export async function submitParentSupport(input: {
  schoolSlug: string;
  studentId: string;
  category: typeof parentCategories[number];
  subject: string;
  description: string;
  complaintBy: typeof complaintByOptions[number];
  complaintByOtherName?: string;
  parentPhone: string;
}) {
  const school = await prisma.school.findUnique({
    where: { slug: input.schoolSlug }, select: { id: true },
  });
  if (!school) throw new ApiError(404, "School not found.");

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      schoolId: school.id,
      studentId: input.studentId,
      active: true,
      student: { status: "ACTIVE" },
      academicYear: { active: true },
      class: { active: true },
      section: { active: true },
    },
    select: {
      id: true,
      student: {
        select: {
          phone: true,
          fullName: true,
          fatherName: true,
          fatherPhone: true,
          motherName: true,
          motherPhone: true,
          guardianName: true,
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

  const otherName = input.complaintByOtherName?.trim();
  if (input.complaintBy === "OTHER" && (!otherName || otherName.length < 2)) {
    throw new ApiError(400, "Enter the name of the person raising the complaint.");
  }

  const complaintByName = input.complaintBy === "OTHER"
    ? otherName!
    : {
        FATHER: enrollment.student.fatherName || "Father",
        MOTHER: enrollment.student.motherName || "Mother",
        GUARDIAN: enrollment.student.guardianName || "Guardian",
        STUDENT: enrollment.student.fullName || "Student",
      }[input.complaintBy];

  const ticket = await prisma.supportTicket.create({
    data: {
      schoolId: school.id,
      ticketNo: `TCK-${randomUUID().slice(0, 12).toUpperCase()}`,
      subject: input.subject,
      description: input.description,
      type: input.category,
      studentId: input.studentId,
      source: "PARENT_QR",
      parentName: complaintByName,
      parentPhone: input.parentPhone || null,
      complaintBy: input.complaintBy,
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
      parentName: complaintByName,
      status: "OPEN",
      eventKey: "created",
  }).catch((error) => console.error("Parent query WhatsApp failed", error));
  return ticket;
}

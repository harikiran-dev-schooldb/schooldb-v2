import { randomBytes } from "node:crypto";

import type { AdmissionApplicationStatus, Prisma } from "@/generated/prisma/client";
import { safelyProvisionStudentLogin } from "@/features/auth/account-provisioning";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { queueAdmissionWhatsappUpdate } from "@/features/whatsapp/service";

import type { PublicAdmissionInput } from "./admission.schema";

function applicationNumber() {
  return `APP-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function contactNumbers(input: PublicAdmissionInput) {
  return [input.fatherPhone, input.motherPhone, input.guardianPhone].filter(
    (value): value is string => Boolean(value),
  );
}

export async function admissionPublicOptions(schoolSlug: string) {
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: {
      id: true,
      name: true,
      logo: true,
      academicYears: {
        where: { active: true },
        orderBy: { startDate: "desc" },
        take: 1,
        select: { id: true, name: true },
      },
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

export async function submitAdmission(schoolSlug: string, input: PublicAdmissionInput) {
  const school = await prisma.school.findUnique({ where: { slug: schoolSlug }, select: { id: true, name: true } });
  if (!school) throw new ApiError(404, "School not found.");

  const [academicYear, applyingClass, preferredSection] = await Promise.all([
    prisma.academicYear.findFirst({ where: { id: input.academicYearId, schoolId: school.id, active: true }, select: { id: true } }),
    prisma.class.findFirst({ where: { id: input.applyingClassId, schoolId: school.id, active: true }, select: { id: true } }),
    input.preferredSectionId
      ? prisma.section.findFirst({ where: { id: input.preferredSectionId, classId: input.applyingClassId, active: true }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  if (!academicYear || !applyingClass || (input.preferredSectionId && !preferredSection)) {
    throw new ApiError(400, "Choose a valid academic year, class, and section.");
  }

  const phones = contactNumbers(input);
  const duplicateFilters: Prisma.AdmissionApplicationWhereInput[] = [];
  if (input.studentAadhar) duplicateFilters.push({ studentAadhar: input.studentAadhar });
  if (phones.length) {
    duplicateFilters.push({
      studentName: { equals: input.studentName, mode: "insensitive" },
      dob: new Date(`${input.dob}T00:00:00`),
      OR: [
        { fatherPhone: { in: phones } },
        { motherPhone: { in: phones } },
        { guardianPhone: { in: phones } },
      ],
    });
  }

  if (duplicateFilters.length) {
    const duplicate = await prisma.admissionApplication.findFirst({
      where: { schoolId: school.id, status: { notIn: ["REJECTED", "CONVERTED"] }, OR: duplicateFilters },
      select: { applicationNo: true },
    });
    if (duplicate) throw new ApiError(409, `An application already exists (${duplicate.applicationNo}).`);
  }
  if (input.studentAadhar) {
    const existingStudent = await prisma.student.findFirst({ where: { schoolId: school.id, studentAadhar: input.studentAadhar }, select: { admissionNo: true } });
    if (existingStudent) throw new ApiError(409, "This Aadhaar number already belongs to an enrolled student.");
  }

  const { website: _website, ...data } = input;
  void _website;
  const application = await prisma.admissionApplication.create({
    data: {
      ...data,
      applicationNo: applicationNumber(),
      schoolId: school.id,
      dob: new Date(`${input.dob}T00:00:00`),
      history: { create: { toStatus: "SUBMITTED", changedBy: "Family application" } },
    },
    select: { id: true, applicationNo: true, studentName: true, status: true, submittedAt: true },
  });
  await queueAdmissionWhatsappUpdate({ schoolId: school.id, applicationId: application.id, applicationNo: application.applicationNo, studentName: application.studentName, phone: input.fatherPhone || input.motherPhone || input.guardianPhone, status: application.status, schoolName: school.name });
  return application;
}

const transitions: Record<AdmissionApplicationStatus, AdmissionApplicationStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "APPROVED", "WAITLISTED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "WAITLISTED", "REJECTED"],
  APPROVED: ["UNDER_REVIEW", "WAITLISTED", "REJECTED"],
  WAITLISTED: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  REJECTED: ["UNDER_REVIEW"],
  CONVERTED: [],
};

export async function changeAdmissionStatus(input: {
  id: string;
  schoolId: string;
  status: AdmissionApplicationStatus;
  note: string | null;
  changedBy: string;
}) {
  const current = await prisma.admissionApplication.findFirst({ where: { id: input.id, schoolId: input.schoolId }, select: { status: true } });
  if (!current) throw new ApiError(404, "Application not found.");
  if (!transitions[current.status].includes(input.status)) throw new ApiError(400, "This status change is not allowed.");
  const application = await prisma.admissionApplication.update({
    where: { id: input.id },
    data: {
      status: input.status,
      notes: input.note,
      reviewedAt: new Date(),
      history: { create: { fromStatus: current.status, toStatus: input.status, note: input.note, changedBy: input.changedBy } },
    },
    select: { id: true, applicationNo: true, studentName: true, status: true },
  });
  const details = await prisma.admissionApplication.findUnique({ where: { id: application.id }, select: { fatherPhone: true, motherPhone: true, guardianPhone: true, whatsappOptIn: true, school: { select: { name: true } } } });
  if (details?.whatsappOptIn) await queueAdmissionWhatsappUpdate({ schoolId: input.schoolId, applicationId: application.id, applicationNo: application.applicationNo, studentName: application.studentName, phone: details.fatherPhone || details.motherPhone || details.guardianPhone, status: application.status, schoolName: details.school.name });
  return application;
}

export async function convertAdmission(input: {
  id: string;
  schoolId: string;
  admissionNo: string;
  sectionId: string;
  rollNo: number | null;
  changedBy: string;
}) {
  const application = await prisma.admissionApplication.findFirst({
    where: { id: input.id, schoolId: input.schoolId },
    include: { school: { select: { name: true } } },
  });
  if (!application) throw new ApiError(404, "Application not found.");
  if (application.status !== "APPROVED") throw new ApiError(400, "Approve the application before converting it.");

  const [section, duplicateAadhar] = await Promise.all([
    prisma.section.findFirst({ where: { id: input.sectionId, classId: application.applyingClassId, active: true }, select: { id: true } }),
    application.studentAadhar
      ? prisma.student.findFirst({ where: { schoolId: input.schoolId, studentAadhar: application.studentAadhar }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  if (!section) throw new ApiError(400, "Choose a valid section for the applying class.");
  if (duplicateAadhar) throw new ApiError(409, "A student with this Aadhaar number already exists.");

  const primaryPhone = application.fatherPhone || application.motherPhone || application.guardianPhone;
  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.admissionApplication.updateMany({
      where: { id: application.id, schoolId: input.schoolId, status: "APPROVED", studentId: null },
      data: { status: "CONVERTED", convertedAt: new Date() },
    });
    if (claimed.count !== 1) throw new ApiError(409, "This application has already been converted.");
    const setting = await tx.schoolAdmissionSetting.upsert({
      where: { schoolId: input.schoolId },
      create: { schoolId: input.schoolId },
      update: {},
    });
    let admissionNo = input.admissionNo.trim();
    if (setting.automaticNumbering) {
      const allocated = await tx.schoolAdmissionSetting.update({ where: { schoolId: input.schoolId }, data: { nextNumber: { increment: 1 } } });
      admissionNo = `${allocated.admissionPrefix}${String(allocated.nextNumber - 1).padStart(allocated.numberPadding, "0")}`;
    }
    if (!admissionNo) throw new ApiError(400, "Admission number is required when automatic numbering is disabled.");
    const duplicateAdmission = await tx.student.findFirst({ where: { schoolId: input.schoolId, admissionNo }, select: { id: true } });
    if (duplicateAdmission) throw new ApiError(409, "Admission number already exists.");
    const student = await tx.student.create({
      data: {
        schoolId: input.schoolId,
        admissionNo,
        username: `STD_${admissionNo}`,
        fullName: application.studentName,
        gender: application.gender,
        dob: application.dob,
        joinedDate: new Date(),
        phone: primaryPhone,
        email: application.email,
        studentAadhar: application.studentAadhar,
        apaarId: application.apaarId,
        fatherName: application.fatherName,
        fatherPhone: application.fatherPhone,
        motherName: application.motherName,
        motherPhone: application.motherPhone,
        guardianName: application.guardianName,
        guardianPhone: application.guardianPhone,
        guardianRelation: application.guardianRelation,
        address: application.address,
        city: application.city,
        district: application.district,
        state: application.state,
        pincode: application.pincode,
        medicalConditions: application.medicalConditions,
        transportRequired: application.transportRequired,
        whatsappOptIn: application.whatsappOptIn,
        whatsappOptInAt: application.whatsappOptIn ? new Date() : null,
      },
      select: { id: true, admissionNo: true, fullName: true },
    });
    await tx.studentEnrollment.create({
      data: {
        schoolId: input.schoolId,
        studentId: student.id,
        academicYearId: application.academicYearId,
        classId: application.applyingClassId,
        sectionId: input.sectionId,
        rollNo: input.rollNo,
        admissionDate: new Date(),
      },
    });
    await tx.studentActivity.create({
      data: { schoolId: input.schoolId, studentId: student.id, type: "STUDENT_CREATED", title: "Converted from online admission", description: `Application ${application.applicationNo} was approved and converted into a student profile.` },
    });
    await tx.admissionApplication.update({
      where: { id: application.id },
      data: {
        studentId: student.id,
        history: { create: { fromStatus: "APPROVED", toStatus: "CONVERTED", note: `Student admission ${admissionNo} created.`, changedBy: input.changedBy } },
      },
    });
    return student;
  });

  const loginAccess = await safelyProvisionStudentLogin(result.id, input.schoolId);
  if (application.whatsappOptIn) {
    await queueAdmissionWhatsappUpdate({
      schoolId: input.schoolId,
      applicationId: application.id,
      applicationNo: application.applicationNo,
      studentName: application.studentName,
      phone: application.fatherPhone || application.motherPhone || application.guardianPhone,
      status: "CONVERTED",
      schoolName: application.school.name,
    });
  }
  return { ...result, loginAccess };
}

import { studentRepository } from "../repositories/student.repository";
import { StudentFormOutput } from "../schemas/student.schema";
import { StudentStatus } from "@/generated/prisma/enums";
import { ListQuery } from "@/types/query";
import { studentActivityService } from "./student-activity.service";
import { safelyProvisionStudentLogin } from "@/features/auth/account-provisioning";

type StudentCreateInput = Pick<
  StudentFormOutput,
  "admissionNo" | "fullName" | "gender" | "dob" | "phone" | "email" | "status"
> &
  Partial<StudentFormOutput>;

function studentUsername(admissionNo: string) {
  return `STD_${admissionNo.trim()}`;
}

export const studentService = {
  async list(schoolId: string, query: ListQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where = {
      schoolId,

      status: query.status ?? StudentStatus.ACTIVE,

      ...((query.classId || query.sectionId) && {
        enrollments: {
          some: {
            active: true,
            ...(query.classId && { classId: query.classId }),
            ...(query.sectionId && { sectionId: query.sectionId }),
          },
        },
      }),

      ...(query.search && {
        OR: [
          {
            admissionNo: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
          {
            fullName: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
          {
            phone: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
    };

    const [students, total] = await Promise.all([
      studentRepository.list(where, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),

      studentRepository.count(where),
    ]);

    return {
      data: students.map(({ enrollments, ...student }) => {
        const enrollment = enrollments[0];

        return {
          ...student,
          className: enrollment?.class.name ?? null,
          sectionName: enrollment?.section.name ?? null,
        };
      }),

      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  /* ---------------------------------------------------------------------- */
  /* Create                                                                 */
  /* ---------------------------------------------------------------------- */

  async create(schoolId: string, input: StudentCreateInput) {
    const exists = await studentRepository.findByAdmissionNo(
      schoolId,
      input.admissionNo,
    );

    if (exists) {
      throw new Error("Admission number already exists.");
    }

    /* -------------------------------------------------------------- */
    /* Create student                                                  */
    /* -------------------------------------------------------------- */

    const normalized: StudentFormOutput = {
      joinedDate: null,
      alternatePhone: null,
      imageUrl: null,
      studentAadhar: null,
      apaarId: null,
      penNo: null,
      emisNo: null,
      bloodGroup: null,
      nationality: null,
      motherTongue: null,
      religion: null,
      category: null,
      caste: null,
      subCaste: null,
      address: null,
      city: null,
      district: null,
      state: null,
      pincode: null,
      country: null,
      fatherName: null,
      fatherPhone: null,
      fatherEmail: null,
      fatherAadhar: null,
      fatherOccupation: null,
      fatherQualification: null,
      fatherIncome: null,
      motherName: null,
      motherPhone: null,
      motherEmail: null,
      motherAadhar: null,
      motherOccupation: null,
      motherQualification: null,
      motherIncome: null,
      guardianName: null,
      guardianPhone: null,
      guardianRelation: null,
      doctorName: null,
      doctorPhone: null,
      medicalConditions: null,
      allergies: null,
      hostelRequired: false,
      transportRequired: false,
      whatsappOptIn: false,
      remarks: null,
      ...input,
    };
    const { dob, joinedDate, whatsappOptIn, ...studentData } = normalized;

    const student = await studentRepository.create({
      ...studentData,
      whatsappOptIn,
      whatsappOptInAt: whatsappOptIn ? new Date() : null,
      username: studentUsername(normalized.admissionNo),
      dob: new Date(`${dob}T00:00:00`),
      joinedDate: joinedDate ? new Date(`${joinedDate}T00:00:00`) : null,

      school: {
        connect: {
          id: schoolId,
        },
      },
    });

    /* -------------------------------------------------------------- */
    /* Create activity                                                 */
    /* -------------------------------------------------------------- */

    await studentActivityService.create({
      schoolId,

      studentId: student.id,

      type: "STUDENT_CREATED",

      title: "Student profile created",

      description: `Student ${student.admissionNo}${
        student.fullName ? ` — ${student.fullName}` : ""
      } was added to SchoolDB.`,
    });

    const loginAccess = await safelyProvisionStudentLogin(student.id, schoolId);
    return { ...student, loginAccess };
  },

  /* ---------------------------------------------------------------------- */
  /* Get                                                                    */
  /* ---------------------------------------------------------------------- */

  async get(id: string, schoolId: string) {
    const student = await studentRepository.findById(id, schoolId);

    if (!student) {
      throw new Error("Student not found.");
    }

    return student;
  },

  /* ---------------------------------------------------------------------- */
  /* Update                                                                 */
  /* ---------------------------------------------------------------------- */

  async update(id: string, schoolId: string, input: StudentFormOutput) {
    const student = await studentRepository.findById(id, schoolId);

    if (!student) {
      throw new Error("Student not found.");
    }

    const duplicate = await studentRepository.findFirst({
      schoolId,

      admissionNo: input.admissionNo,

      NOT: {
        id,
      },
    });

    if (duplicate) {
      throw new Error("Admission number already exists.");
    }

    /* -------------------------------------------------------------- */
    /* Update student                                                  */
    /* -------------------------------------------------------------- */

    const { dob, joinedDate, whatsappOptIn, ...studentData } = input;

    const updated = await studentRepository.update(id, schoolId, {
      ...studentData,
      whatsappOptIn,
      whatsappOptInAt:
        whatsappOptIn
          ? student.whatsappOptInAt ?? new Date()
          : null,
      username: studentUsername(input.admissionNo),
      dob: new Date(`${dob}T00:00:00`),
      joinedDate: joinedDate ? new Date(`${joinedDate}T00:00:00`) : null,
    });

    /* -------------------------------------------------------------- */
    /* Activity                                                        */
    /* -------------------------------------------------------------- */

    await studentActivityService.create({
      schoolId,

      studentId: id,

      type: "PROFILE_UPDATED",

      title: "Student profile updated",

      description: `Profile information for ${
        updated.fullName ?? updated.admissionNo
      } was updated.`,
    });

    const loginAccess = await safelyProvisionStudentLogin(updated.id, schoolId);
    return { ...updated, loginAccess };
  },

  /* ---------------------------------------------------------------------- */
  /* Change Status                                                          */
  /* ---------------------------------------------------------------------- */

  async changeStatus(
    id: string,
    schoolId: string,
    status: StudentStatus,
    remarks?: string,
  ) {
    const student = await studentRepository.findById(id, schoolId);

    if (!student) {
      throw new Error("Student not found.");
    }

    if (student.status === status) {
      throw new Error("Student already has this status.");
    }

    const updated = await studentRepository.changeStatus(
      id,
      schoolId,
      status,
      remarks,
    );

    /* -------------------------------------------------------------- */
    /* Activity                                                        */
    /* -------------------------------------------------------------- */

    await studentActivityService.create({
      schoolId,

      studentId: id,

      type: "STATUS_CHANGED",

      title: "Student status changed",

      description: `Student status changed from ${student.status} to ${status}${
        remarks ? `. Remark: ${remarks}` : "."
      }`,

      metadata: {
        previousStatus: student.status,
        newStatus: status,
        remarks: remarks ?? null,
      },
    });

    const loginAccess = await safelyProvisionStudentLogin(updated.id, schoolId);
    return { ...updated, loginAccess };
  },

  /* ---------------------------------------------------------------------- */
  /* Profile                                                                */
  /* ---------------------------------------------------------------------- */

  async profile(id: string, schoolId: string) {
    const student = await studentRepository.profile(id, schoolId);

    if (!student) {
      throw new Error("Student not found.");
    }

    return student;
  },

  /* ---------------------------------------------------------------------- */
  /* Options                                                                */
  /* ---------------------------------------------------------------------- */

  async options(
    schoolId: string,
    academicYearId: string,
    excludeEnrollmentId?: string,
    mode: "AVAILABLE" | "ENROLLED" = "AVAILABLE",
  ) {
    const students = await studentRepository.options(
      schoolId,
      academicYearId,
      excludeEnrollmentId,
      mode,
    );

    return students.map((student) => {
      const enrollment = student.enrollments[0];

      return {
        id: student.id,

        label: student.fullName
          ? `${student.admissionNo} — ${student.fullName}`
          : student.admissionNo,

        className: enrollment?.class.name ?? null,
        sectionName: enrollment?.section.name ?? null,
      };
    });
  },
};

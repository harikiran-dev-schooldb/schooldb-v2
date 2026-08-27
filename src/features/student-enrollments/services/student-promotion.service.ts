import { academicYearRepository } from "@/features/academic-years/repositories/academic-year.repository";
import { classRepository } from "@/features/classes/repositories/class.repository";
import { sectionRepository } from "@/features/sections/repositories/section.repository";
import { studentActivityService } from "@/features/students/services/student-activity.service";

import {
  StudentPromotionInput,
} from "../schemas/student-promotion.schema";

import {
  studentPromotionRepository,
} from "../repositories/student-promotion.repository";

export const studentPromotionService = {
  async promote(
    schoolId: string,
    input: StudentPromotionInput,
  ) {
    if (
      input.fromAcademicYearId ===
      input.toAcademicYearId
    ) {
      throw new Error(
        "Source and target academic years must be different.",
      );
    }

    const [
      fromAcademicYear,
      toAcademicYear,
      fromClass,
      toClass,
      fromSection,
      toSection,
    ] = await Promise.all([
      academicYearRepository.findById(
        input.fromAcademicYearId,
        schoolId,
      ),

      academicYearRepository.findById(
        input.toAcademicYearId,
        schoolId,
      ),

      classRepository.findById(
        input.fromClassId,
        schoolId,
      ),

      classRepository.findById(
        input.toClassId,
        schoolId,
      ),

      sectionRepository.findById(
        input.fromSectionId,
        schoolId,
      ),

      sectionRepository.findById(
        input.toSectionId,
        schoolId,
      ),
    ]);

    if (!fromAcademicYear) {
      throw new Error(
        "Source academic year not found.",
      );
    }

    if (!toAcademicYear) {
      throw new Error(
        "Target academic year not found.",
      );
    }

    if (!fromClass) {
      throw new Error(
        "Source class not found.",
      );
    }

    if (!toClass) {
      throw new Error(
        "Target class not found.",
      );
    }

    if (!fromSection) {
      throw new Error(
        "Source section not found.",
      );
    }

    if (!toSection) {
      throw new Error(
        "Target section not found.",
      );
    }

    if (
      fromSection.classId !==
      input.fromClassId
    ) {
      throw new Error(
        "Source section does not belong to the selected source class.",
      );
    }

    if (
      toSection.classId !==
      input.toClassId
    ) {
      throw new Error(
        "Target section does not belong to the selected target class.",
      );
    }

    const requestedStudentIds =
      input.students.map(
        (student) => student.studentId,
      );

    const uniqueStudentIds = new Set(
      requestedStudentIds,
    );

    if (
      uniqueStudentIds.size !==
      requestedStudentIds.length
    ) {
      throw new Error(
        "A student cannot be selected more than once.",
      );
    }

    const sourceEnrollments =
      await studentPromotionRepository.getSourceEnrollments(
        schoolId,
        input.fromAcademicYearId,
        input.fromClassId,
        input.fromSectionId,
        requestedStudentIds,
      );

    if (
      sourceEnrollments.length !==
      requestedStudentIds.length
    ) {
      const foundIds = new Set(
        sourceEnrollments.map(
          (item) => item.studentId,
        ),
      );

      const missing = requestedStudentIds.filter(
        (id) => !foundIds.has(id),
      );

      throw new Error(
        `One or more selected students are not actively enrolled in ${fromClass.name} - ${fromSection.name} for ${fromAcademicYear.name}. Missing: ${missing.join(", ")}`,
      );
    }

    const existingTarget =
      await studentPromotionRepository.findExistingTargetEnrollments(
        schoolId,
        input.toAcademicYearId,
        requestedStudentIds,
      );

    if (existingTarget.length > 0) {
      const existingIds = new Set(
        existingTarget.map(
          (item) => item.studentId,
        ),
      );

      const duplicateStudents =
        sourceEnrollments
          .filter((item) =>
            existingIds.has(item.studentId),
          )
          .map(
            (item) =>
              `${item.student.admissionNo} — ${item.student.fullName ?? "Unnamed Student"}`,
          );

      throw new Error(
        `The following students are already enrolled in ${toAcademicYear.name}: ${duplicateStudents.join(", ")}`,
      );
    }

    const sourceByStudent = new Map(
      sourceEnrollments.map((item) => [
        item.studentId,
        item,
      ]),
    );

    const rows =
      input.students.map((student) => {
        const source =
          sourceByStudent.get(
            student.studentId,
          );

        if (!source) {
          throw new Error(
            `Student ${student.studentId} was not found in the source enrollment.`,
          );
        }

        return {
          schoolId,

          studentId:
            source.studentId,

          academicYearId:
            input.toAcademicYearId,

          classId:
            input.toClassId,

          sectionId:
            input.toSectionId,

          rollNo:
            student.rollNo ?? null,

          active: true,
        };
      });

    const created =
      await studentPromotionRepository.createMany(
        rows,
      );

    for (const enrollment of created) {
      const source =
        sourceByStudent.get(
          enrollment.studentId,
        );

      if (!source) {
        continue;
      }

      await studentActivityService.create({
        schoolId,

        studentId:
          enrollment.studentId,

        enrollmentId:
          enrollment.id,

        type: "STUDENT_PROMOTED",

        title:
          "Student promoted",

        description:
          `${source.student.fullName ?? source.student.admissionNo} promoted from ${fromClass.name} — ${fromSection.name} (${fromAcademicYear.name}) to ${toClass.name} — ${toSection.name} (${toAcademicYear.name}).`,

        metadata: {
          fromAcademicYearId:
            input.fromAcademicYearId,

          toAcademicYearId:
            input.toAcademicYearId,

          fromClassId:
            input.fromClassId,

          toClassId:
            input.toClassId,

          fromSectionId:
            input.fromSectionId,

          toSectionId:
            input.toSectionId,

          sourceEnrollmentId:
            source.id,

          targetEnrollmentId:
            enrollment.id,
        },
      });
    }

    return {
      created: created.length,
      skipped: 0,
      errors: [],
    };
  },
};
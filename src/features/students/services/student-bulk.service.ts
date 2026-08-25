import { studentService } from "./student.service";
import {
  bulkStudentsSchema,
  type BulkStudentRow,
} from "../schemas/bulk-student.schema";

export const studentBulkService = {
  async import(schoolId: string, input: unknown) {
    const parsed = bulkStudentsSchema.parse(input);

    const results: Array<{
      row: number;
      status: "created" | "failed";
      admissionNo: string;
      message?: string;
    }> = [];

    for (const [index, row] of parsed.students.entries()) {
      const student = row as BulkStudentRow;

      try {
        await studentService.create(schoolId, student);

        results.push({
          row: index + 2,
          status: "created",
          admissionNo: student.admissionNo,
        });
      } catch (error) {
        results.push({
          row: index + 2,
          status: "failed",
          admissionNo: student.admissionNo,
          message:
            error instanceof Error
              ? error.message
              : "Unable to create student.",
        });
      }
    }

    const created = results.filter((item) => item.status === "created").length;
    const failed = results.length - created;

    return {
      created,
      failed,
      errors: results
        .filter((item) => item.status === "failed")
        .map((item) => ({
          row: item.row,
          message: `${item.admissionNo}: ${item.message}`,
        })),
    };
  },
};

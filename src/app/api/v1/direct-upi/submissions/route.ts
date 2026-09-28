import { directUpiSubmissionSchema } from "@/features/online-payments/schemas/direct-upi-submission.schema";
import { directUpiPaymentService } from "@/features/online-payments/services/direct-upi-payment.service";
import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { ApiResponse } from "@/lib/response";
import { requireStudentAccess } from "@/lib/student-access";
import { validateBody } from "@/lib/validation";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const input = await validateBody(request, directUpiSubmissionSchema);
    const { membership, enrollment } = await requireStudentAccess(
      input.schoolSlug,
      input.studentId,
    );

    if (!enrollment) {
      throw new ApiError(404, "Active student enrollment not found.");
    }

    const submission = await directUpiPaymentService.submit({
      schoolId: membership.schoolId,
      enrollmentId: enrollment.id,
      submittedByUserId: membership.userId,
      installmentIds: input.installmentIds,
      utr: input.utr,
    });

    return ApiResponse.success(
      {
        ...submission,
        amount: Number(submission.amount),
      },
      "Payment submitted for school verification.",
      201,
    );
  });
}

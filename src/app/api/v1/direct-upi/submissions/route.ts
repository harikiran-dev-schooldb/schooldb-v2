import { apiHandler } from "@/lib/api";
import { ApiError } from "@/lib/errors";

export async function POST() {
  return apiHandler(async () => {
    throw new ApiError(
      410,
      "Manual UTR submission is no longer supported. Use the verified Cashfree UPI / QR payment option.",
    );
  });
}

import { ApiError } from "./errors";
import { ApiResponse } from "./response";
import { hasPrismaErrorCode, safeDatabaseError } from "./database-error";

type SafeApiError = {
  message: string;
  status: number;
};

export function safeApiError(error: unknown): SafeApiError {
  if (error instanceof ApiError) {
    return { message: error.message, status: error.status };
  }

  const databaseError = safeDatabaseError(error);
  if (databaseError) return databaseError;

  if (error instanceof Error) {
    const internal =
      error instanceof TypeError ||
      hasPrismaErrorCode(error) ||
      /Prisma|database|ECONN|connection|query engine/i.test(error.name);
    return internal
      ? { message: "An unexpected server error occurred", status: 500 }
      : { message: error.message, status: 400 };
  }

  return { message: "Internal Server Error", status: 500 };
}

export function apiErrorResponse(error: unknown, fallbackMessage?: string) {
  const safe = safeApiError(error);
  return ApiResponse.error(
    safe.status === 500 && fallbackMessage ? fallbackMessage : safe.message,
    safe.status,
  );
}

export async function apiHandler(callback: () => Promise<Response>) {
  try {
    return await callback();
  } catch (error) {
    console.error(error);
    return apiErrorResponse(error);
  }
}

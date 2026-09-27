import { ApiError } from "./errors";
import { ApiResponse } from "./response";

export async function apiHandler(callback: () => Promise<Response>) {
  try {
    return await callback();
  } catch (error) {
    console.error(error);

    if (error instanceof ApiError) {
      return ApiResponse.error(error.message, error.status);
    }

    if (error instanceof Error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";
      const internal =
        error instanceof TypeError ||
        /^P\d{4}$/.test(code) ||
        /Prisma|database|ECONN|connection|query engine/i.test(error.name);
      return internal
        ? ApiResponse.error("An unexpected server error occurred", 500)
        : ApiResponse.error(error.message, 400);
    }

    return ApiResponse.error();
  }
}

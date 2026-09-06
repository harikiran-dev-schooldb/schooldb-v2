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
      return ApiResponse.error(error.message, 400);
    }

    return ApiResponse.error();
  }
}

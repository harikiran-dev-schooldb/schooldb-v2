import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { createLibraryBook, createLibraryCategory, issueLibraryBook, renewLibraryLoan, returnLibraryBook } from "@/features/library/service";

const schema = z.object({ action: z.enum(["CREATE_CATEGORY", "CREATE_BOOK", "ISSUE", "RETURN", "RENEW"]), data: z.unknown() });
export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const input = schema.parse(await request.json());
    const result = input.action === "CREATE_CATEGORY" ? await createLibraryCategory(membership.schoolId, input.data) : input.action === "CREATE_BOOK" ? await createLibraryBook(membership.schoolId, input.data) : input.action === "ISSUE" ? await issueLibraryBook(membership.schoolId, input.data) : input.action === "RETURN" ? await returnLibraryBook(membership.schoolId, input.data) : await renewLibraryLoan(membership.schoolId, input.data);
    return ApiResponse.success(result, "Library updated successfully.", 201);
  });
}

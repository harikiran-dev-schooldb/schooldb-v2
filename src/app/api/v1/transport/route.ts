import { z } from "zod";

import {
  archiveTransportAssignment,
  assignStudentTransport,
  createTransportRoute,
  createTransportStop,
  createTransportVehicle,
} from "@/features/transport/service";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

const requestSchema = z.object({
  action: z.enum([
    "CREATE_VEHICLE",
    "CREATE_ROUTE",
    "CREATE_STOP",
    "ASSIGN_STUDENT",
    "ARCHIVE_ASSIGNMENT",
  ]),
  data: z.unknown(),
});

export async function POST(request: Request) {
  return apiHandler(async () => {
    const membership = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const input = requestSchema.parse(await request.json());

    const result = input.action === "CREATE_VEHICLE"
      ? await createTransportVehicle(membership.schoolId, input.data)
      : input.action === "CREATE_ROUTE"
        ? await createTransportRoute(membership.schoolId, input.data)
        : input.action === "CREATE_STOP"
          ? await createTransportStop(membership.schoolId, input.data)
          : input.action === "ASSIGN_STUDENT"
            ? await assignStudentTransport(membership.schoolId, input.data)
            : await archiveTransportAssignment(
                membership.schoolId,
                z.object({ assignmentId: z.string().min(1) }).parse(input.data).assignmentId,
              );

    return ApiResponse.success(result, "Transport details saved successfully.", 201);
  });
}

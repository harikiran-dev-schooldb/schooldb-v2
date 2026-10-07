import { Prisma } from "@/generated/prisma/client";

import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const IDEMPOTENCY_KEY = "idempotency-key";

type MutationActor = {
  schoolId: string;
  userId: string;
};

type MutationResult<T> = {
  data: T;
  replayed: boolean;
};

function mutationId(request: Request) {
  const value = request.headers.get(IDEMPOTENCY_KEY)?.trim();
  if (!value) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(400, "Idempotency-Key must be a valid UUID.");
  }
  return value;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function runOfflineMutation<T>(
  request: Request,
  actor: MutationActor,
  scope: string,
  operation: (mutationId: string | null) => Promise<T>,
): Promise<MutationResult<T>> {
  const id = mutationId(request);
  if (!id) return { data: await operation(null), replayed: false };

  const existing = await prisma.offlineMutationReceipt.findUnique({
    where: { id },
  });
  if (existing) {
    if (
      existing.schoolId !== actor.schoolId ||
      existing.userId !== actor.userId ||
      existing.scope !== scope
    ) {
      throw new ApiError(409, "This offline request key is already in use.");
    }
    if (existing.status === "COMPLETED") {
      return { data: existing.result as T, replayed: true };
    }
    const staleBefore = Date.now() - 5 * 60 * 1_000;
    if (existing.updatedAt.getTime() >= staleBefore) {
      throw new ApiError(425, "This offline request is already being processed.");
    }
    await prisma.offlineMutationReceipt.deleteMany({
      where: { id, status: "PROCESSING", updatedAt: existing.updatedAt },
    });
  }

  try {
    await prisma.offlineMutationReceipt.create({
      data: {
        id,
        schoolId: actor.schoolId,
        userId: actor.userId,
        scope,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ApiError(425, "This offline request is already being processed.");
    }
    throw error;
  }

  try {
    const data = await operation(id);
    await prisma.offlineMutationReceipt.update({
      where: { id },
      data: {
        status: "COMPLETED",
        result: jsonValue(data),
        completedAt: new Date(),
      },
    });
    return { data, replayed: false };
  } catch (error) {
    await prisma.offlineMutationReceipt.deleteMany({
      where: { id, status: "PROCESSING" },
    });
    throw error;
  }
}

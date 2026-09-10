import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { withTransactionRetry } from "@/lib/transaction-retry";

export function runSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return withTransactionRetry(() =>
    prisma.$transaction(operation, {
      isolationLevel: "Serializable",
      maxWait: 5_000,
      timeout: 15_000,
    }),
  );
}

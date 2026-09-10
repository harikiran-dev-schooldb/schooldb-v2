export type TransactionError = {
  code?: string;
};

export function isRetryableTransactionError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as TransactionError).code === "P2034"
  );
}

export async function withTransactionRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableTransactionError(error) || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw lastError;
}

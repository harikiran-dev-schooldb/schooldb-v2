export const IMPORT_BATCH_SIZE = 500;

export type ImportProgress = {
  completedRows: number;
  totalRows: number;
  completedBatches: number;
  totalBatches: number;
};

type ImportResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

function mergeBatchResult(
  combined: Record<string, unknown>,
  current: Record<string, unknown>,
  rowOffset: number,
) {
  for (const [key, value] of Object.entries(current)) {
    if (typeof value === "number") {
      combined[key] = Number(combined[key] ?? 0) + value;
      continue;
    }

    if (Array.isArray(value)) {
      const adjusted = value.map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "row" in item &&
          typeof item.row === "number"
        ) {
          return { ...item, row: item.row + rowOffset };
        }
        return item;
      });
      combined[key] = [...((combined[key] as unknown[]) ?? []), ...adjusted];
      continue;
    }

    combined[key] = value;
  }
}

/**
 * Keeps every server request small while allowing one CSV to contain the
 * school's complete dataset. Each successful batch is committed before the
 * next batch starts. A failure reports the completed row count so the operator
 * can remove those committed rows before retrying a corrected file.
 */
export async function postImportInBatches<T, TResult extends Record<string, unknown>>({
  endpoint,
  bodyKey,
  rows,
  batchSize = IMPORT_BATCH_SIZE,
  onProgress,
  failureMessage,
  staticBody,
}: {
  endpoint: string;
  bodyKey: string;
  rows: T[];
  batchSize?: number;
  onProgress?: (progress: ImportProgress) => void;
  failureMessage: string;
  staticBody?: Record<string, unknown>;
}): Promise<TResult> {
  const totalBatches = Math.ceil(rows.length / batchSize);
  const combined: Record<string, unknown> = {};

  onProgress?.({
    completedRows: 0,
    totalRows: rows.length,
    completedBatches: 0,
    totalBatches,
  });

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
    const start = batchIndex * batchSize;
    const batch = rows.slice(start, start + batchSize);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...staticBody, [bodyKey]: batch }),
    });
    const payload = (await response.json()) as ImportResponse;

    if (!response.ok || !payload.success || !payload.data) {
      const imported = start;
      throw new Error(
        imported > 0
          ? `${payload.message ?? failureMessage} Batch ${batchIndex + 1} of ${totalBatches} failed after ${imported} rows were committed. Remove the first ${imported} data rows before retrying the corrected CSV.`
          : `${payload.message ?? failureMessage} Batch ${batchIndex + 1} of ${totalBatches} failed; no rows from this file were committed by an earlier batch.`,
      );
    }

    mergeBatchResult(combined, payload.data, start);
    onProgress?.({
      completedRows: start + batch.length,
      totalRows: rows.length,
      completedBatches: batchIndex + 1,
      totalBatches,
    });
  }

  return combined as TResult;
}

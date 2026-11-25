export type ClassPlanning = { termFee?: number; annualFees?: number; seatCapacity?: number };
export type AdmissionPlanning = Record<string, ClassPlanning>;
export function seatBalance(capacity: number | undefined, admitted: number) { return capacity === undefined ? null : capacity - admitted; }
export function readPlanning(value: unknown): AdmissionPlanning {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: AdmissionPlanning = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row: ClassPlanning = {};
    for (const key of ["termFee","annualFees","seatCapacity"] as const) {
      const n = (raw as Record<string, unknown>)[key];
      if (typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= (key === "seatCapacity" ? 100000 : 100000000)) row[key] = n;
    }
    result[id] = row;
  }
  return result;
}

export const BULK_DATE_FORMATS = [
  { value: "ISO", label: "YYYY-MM-DD", example: "2012-06-15" },
  { value: "DMY_SLASH", label: "DD/MM/YYYY or DD/MM/YY", example: "15/06/2012" },
  { value: "DMY_DASH", label: "DD-MM-YYYY or DD-MM-YY", example: "15-06-2012" },
  { value: "MDY_SLASH", label: "MM/DD/YYYY or MM/DD/YY", example: "06/15/2012" },
  { value: "MDY_DASH", label: "MM-DD-YYYY or MM-DD-YY", example: "06-15-2012" },
  { value: "EXCEL_SERIAL", label: "Excel serial number", example: "41075" },
] as const;

export type BulkDateFormat = (typeof BULK_DATE_FORMATS)[number]["value"];

function fullYear(value: string) {
  const year = Number(value);
  if (value.length === 4) return year;
  return year >= 50 ? 1900 + year : 2000 + year;
}

function isoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return [year, month, day]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
}

function excelSerialDate(input: string) {
  if (!/^\d+(?:\.\d+)?$/.test(input)) return null;
  const serial = Math.floor(Number(input));
  if (!Number.isFinite(serial) || serial < 1 || serial > 200_000) return null;

  // Excel incorrectly treats 1900 as a leap year. Serial 60 is its fictitious
  // 1900-02-29, so values from 60 onward need one day removed.
  const adjustedDays = serial >= 60 ? serial - 1 : serial;
  const milliseconds = Date.UTC(1899, 11, 31) + adjustedDays * 86_400_000;
  const date = new Date(milliseconds);
  return isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function normalizeBulkDate(value: string, format: BulkDateFormat) {
  const input = value.replace(/^\uFEFF/, "").trim();
  if (!input) return null;
  if (format === "EXCEL_SERIAL") return excelSerialDate(input);

  let match: RegExpExecArray | null;
  let year: number;
  let month: number;
  let day: number;

  if (format === "ISO") {
    match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input);
    if (!match) return null;
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    const separator = format.endsWith("SLASH") ? "\\/" : "-";
    match = new RegExp(`^(\\d{1,2})${separator}(\\d{1,2})${separator}(\\d{2}|\\d{4})$`).exec(input);
    if (!match) return null;
    year = fullYear(match[3]);
    if (format.startsWith("DMY")) {
      day = Number(match[1]);
      month = Number(match[2]);
    } else {
      month = Number(match[1]);
      day = Number(match[2]);
    }
  }

  return isoDate(year, month, day);
}

export function bulkDateFormatExample(format: BulkDateFormat) {
  return BULK_DATE_FORMATS.find((option) => option.value === format)?.example ?? "";
}

export function bulkDateFormatLabel(format: BulkDateFormat) {
  return BULK_DATE_FORMATS.find((option) => option.value === format)?.label ?? format;
}

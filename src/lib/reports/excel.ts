import ExcelJS from "exceljs";

export type ExcelReportColumn<T> = {
  header: string;
  key: string;
  width?: number;
  value: (row: T, index: number) => string | number | Date | null | undefined;
  numFmt?: string;
};

export async function createSchoolReportWorkbook<T>({
  schoolName,
  reportName,
  periodLabel,
  columns,
  rows,
  sheetName = "Report",
}: {
  schoolName: string;
  reportName: string;
  periodLabel: string;
  columns: ExcelReportColumn<T>[];
  rows: T[];
  sheetName?: string;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SchoolDB";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName.substring(0, 31), {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const lastColumn = Math.max(columns.length, 1);

  for (let row = 1; row <= 3; row += 1) sheet.mergeCells(row, 1, row, lastColumn);
  sheet.getCell("A1").value = schoolName.toUpperCase();
  sheet.getCell("A2").value = reportName.toUpperCase();
  sheet.getCell("A3").value = periodLabel;

  [1, 2, 3].forEach((row) => {
    sheet.getRow(row).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(row).font = { bold: true, size: row === 1 ? 16 : row === 2 ? 13 : 11 };
  });
  sheet.getRow(1).height = 25;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 20;
  sheet.getRow(4).height = 8;

  columns.forEach((column, index) => {
    const cell = sheet.getCell(5, index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF091540" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } },
    };
    sheet.getColumn(index + 1).width = column.width ?? 18;
  });
  sheet.getRow(5).height = 28;

  rows.forEach((item, rowIndex) => {
    const excelRow = sheet.getRow(rowIndex + 6);
    columns.forEach((column, columnIndex) => {
      const cell = excelRow.getCell(columnIndex + 1);
      cell.value = column.value(item, rowIndex) ?? "";
      if (column.numFmt) cell.numFmt = column.numFmt;
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "hair", color: { argb: "FFE5E7EB" } },
        left: { style: "hair", color: { argb: "FFE5E7EB" } },
        bottom: { style: "hair", color: { argb: "FFE5E7EB" } },
        right: { style: "hair", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(rows.length + 5, 5), column: lastColumn } };
  return workbook;
}

export function reportDateRange(from?: string, to?: string) {
  if (from && to) return `Date Range: ${from} to ${to}`;
  if (from) return `From Date: ${from}`;
  if (to) return `Up to Date: ${to}`;
  return "Date Range: All records";
}

export function safeReportFilename(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

import ExcelJS from "exceljs";

import type { StudentComprehensiveReport } from "./student-comprehensive-report.service";

const BORDER_COLOR = "FFD8DEE9";
const HEADER_COLOR = "FF4338CA";
const ALTERNATE_ROW_COLOR = "FFF5F7FF";

function columnWidth(header: string, values: unknown[]) {
  const longest = Math.max(
    header.length,
    ...values.map((value) => String(value ?? "").length),
  );
  return Math.min(Math.max(longest + 3, 12), 42);
}

export function createStudentComprehensiveWorkbook(
  report: StudentComprehensiveReport,
  generatedBy: string,
) {
  const workbook = new ExcelJS.Workbook();
  const generatedAt = new Date(report.generatedAt);
  workbook.creator = generatedBy;
  workbook.lastModifiedBy = generatedBy;
  workbook.created = generatedAt;
  workbook.subject = `Complete student report for ${report.studentName}`;
  workbook.keywords = `SchoolDB, student report, ${report.admissionNo}`;

  for (const section of report.sections) {
    const worksheet = workbook.addWorksheet(section.title.slice(0, 31), {
      views: [{ state: "frozen", ySplit: 5 }],
      pageSetup: {
        orientation: section.columns.length > 4 ? "landscape" : "portrait",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.5,
          bottom: 0.5,
          header: 0.2,
          footer: 0.2,
        },
      },
    });
    const lastColumn = Math.max(section.columns.length, 1);
    worksheet.mergeCells(1, 1, 1, lastColumn);
    worksheet.mergeCells(2, 1, 2, lastColumn);
    worksheet.mergeCells(3, 1, 3, lastColumn);
    worksheet.getCell("A1").value = report.schoolName.toUpperCase();
    worksheet.getCell("A2").value =
      `${report.studentName.toUpperCase()} — ${section.title.toUpperCase()}`;
    worksheet.getCell("A3").value =
      `Admission No: ${report.admissionNo} | Generated: ${generatedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;
    worksheet.getRow(1).font = {
      bold: true,
      size: 16,
      color: { argb: "FF111827" },
    };
    worksheet.getRow(2).font = {
      bold: true,
      size: 13,
      color: { argb: HEADER_COLOR },
    };
    worksheet.getRow(3).font = {
      bold: true,
      size: 10,
      color: { argb: "FF64748B" },
    };
    for (let row = 1; row <= 3; row += 1) {
      worksheet.getRow(row).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    }
    worksheet.getRow(1).height = 26;
    worksheet.getRow(2).height = 23;
    worksheet.getRow(3).height = 20;
    worksheet.getRow(4).height = 8;

    section.columns.forEach((column, columnIndex) => {
      const cell = worksheet.getCell(5, columnIndex + 1);
      cell.value = column;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_COLOR },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER_COLOR } },
        left: { style: "thin", color: { argb: BORDER_COLOR } },
        bottom: { style: "thin", color: { argb: BORDER_COLOR } },
        right: { style: "thin", color: { argb: BORDER_COLOR } },
      };
      worksheet.getColumn(columnIndex + 1).width = columnWidth(
        column,
        section.rows.map((row) => row[column]),
      );
    });
    worksheet.getRow(5).height = 28;

    section.rows.forEach((row, rowIndex) => {
      const excelRow = worksheet.getRow(rowIndex + 6);
      section.columns.forEach((column, columnIndex) => {
        const cell = excelRow.getCell(columnIndex + 1);
        cell.value = row[column] ?? "";
        cell.alignment = { vertical: "top", wrapText: true };
        cell.border = {
          top: { style: "hair", color: { argb: BORDER_COLOR } },
          left: { style: "hair", color: { argb: BORDER_COLOR } },
          bottom: { style: "hair", color: { argb: BORDER_COLOR } },
          right: { style: "hair", color: { argb: BORDER_COLOR } },
        };
        if (rowIndex % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: ALTERNATE_ROW_COLOR },
          };
        }
        if (
          ["Payable", "Paid", "Outstanding"].includes(column) &&
          typeof cell.value === "number"
        ) {
          cell.numFmt = "₹#,##0.00";
        }
      });
    });

    if (!section.rows.length) {
      worksheet.mergeCells(6, 1, 6, lastColumn);
      worksheet.getCell(6, 1).value =
        `No ${section.title.toLowerCase()} records available.`;
      worksheet.getCell(6, 1).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.getCell(6, 1).font = {
        italic: true,
        color: { argb: "FF64748B" },
      };
      worksheet.getRow(6).height = 26;
    }

    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: Math.max(section.rows.length + 5, 5), column: lastColumn },
    };
    worksheet.headerFooter.oddFooter = `&L${report.admissionNo}&C${section.title}&RPage &P of &N`;
  }

  return workbook;
}

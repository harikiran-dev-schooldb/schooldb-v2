"use client";

import { BulkCsvImport, type CsvRow } from "@/components/bulk/BulkCsvImport";

const HEADERS = [
  "accessionNo",
  "isbn",
  "title",
  "author",
  "publisher",
  "edition",
  "shelf",
  "category",
  "copies",
] as const;

const SAMPLE_ROWS = [
  ["LIB-0001", "9780143424173", "Wings of Fire", "A. P. J. Abdul Kalam", "Universities Press", "1", "A-01", "Biography", "3"],
  ["LIB-0002", "9788173711466", "The Blue Umbrella", "Ruskin Bond", "Rupa", "1", "B-04", "Fiction", "2"],
] as const;

function validateLibraryRow(row: CsvRow) {
  if (!row.accessionNo || row.accessionNo.length > 40) return "Accession number is required and must be 40 characters or less.";
  if (!row.title || row.title.length < 2 || row.title.length > 240) return "Title must contain 2 to 240 characters.";
  if (!row.author || row.author.length < 2 || row.author.length > 160) return "Author must contain 2 to 160 characters.";
  if (row.category.length > 100) return "Category must be 100 characters or less.";
  if ([row.isbn, row.publisher, row.edition, row.shelf].some((value) => value.length > 160)) return "ISBN, publisher, edition and shelf must each be 160 characters or less.";
  const copies = Number(row.copies);
  if (!Number.isInteger(copies) || copies < 1 || copies > 100) return "Copies must be a whole number from 1 to 100.";
  return null;
}

function normalizeLibraryRow(row: CsvRow) {
  return { ...row, accessionNo: row.accessionNo.toUpperCase(), copies: String(Number(row.copies)) };
}

export default function BulkLibraryPage() {
  return (
    <BulkCsvImport
      title="Bulk Library Catalog"
      description="Import library categories, book details and physical copies from one validated CSV."
      importTitle="Library catalog import"
      uploadLabel="Upload library catalog CSV"
      entityLabel="Library"
      endpoint="/api/v1/library/bulk"
      bodyKey="books"
      headers={HEADERS}
      sampleRows={SAMPLE_ROWS}
      templateFileName="schooldb-library-template.csv"
      validateRow={validateLibraryRow}
      normalizeRow={normalizeLibraryRow}
      duplicateKey={(row) => row.accessionNo}
      duplicateLabel="accession numbers"
    />
  );
}

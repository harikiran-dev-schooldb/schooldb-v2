"use client";

import { BulkCsvImport, type CsvRow } from "@/components/bulk/BulkCsvImport";

const HEADERS = [
  "academicYear",
  "planName",
  "description",
  "classes",
  "feeItems",
] as const;

const FREQUENCIES = new Set([
  "MONTHLY",
  "QUARTERLY",
  "TERMLY",
  "HALF_YEARLY",
  "ANNUAL",
  "CUSTOM",
]);

const SAMPLE_ROWS = [
  [
    "2026-27",
    "Standard Fee Plan",
    "Tuition and annual activity fees",
    "I|II",
    "Tuition Fee|MONTHLY|2500|true;Activity Fee|ANNUAL|1200|true",
  ],
  [
    "2026-27",
    "Transport Fee Plan",
    "Optional school transport fee",
    "ALL",
    "Transport Fee|MONTHLY|1000|false",
  ],
] as const;

function validateFeePlan(row: CsvRow) {
  if (!row.academicYear?.trim() || !row.planName?.trim()) {
    return "Academic year and plan name are required.";
  }
  if (!row.classes?.trim()) {
    return "Enter ALL or one or more class names separated with |.";
  }
  const items = row.feeItems?.split(";").map((item) => item.trim()).filter(Boolean) ?? [];
  if (!items.length) {
    return "Add at least one fee item.";
  }
  const categories = new Set<string>();
  for (const item of items) {
    const [category, frequency, amount, mandatory, ...extra] = item.split("|").map((value) => value.trim());
    if (!category || !frequency || !amount || !mandatory || extra.length) {
      return "Each fee item must use: category|frequency|amount|mandatory.";
    }
    if (!FREQUENCIES.has(frequency.toUpperCase())) {
      return `Invalid frequency for ${category}. Use MONTHLY, QUARTERLY, TERMLY, HALF_YEARLY, ANNUAL, or CUSTOM.`;
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return `Enter a positive amount for ${category}.`;
    }
    if (!new Set(["true", "false", "yes", "no"]).has(mandatory.toLowerCase())) {
      return `Mandatory must be true/false or yes/no for ${category}.`;
    }
    const key = category.toLowerCase();
    if (categories.has(key)) return `Fee category ${category} is repeated in this plan.`;
    categories.add(key);
  }
  return null;
}

export default function BulkFeePlansPage() {
  return (
    <BulkCsvImport
      title="Bulk Fee Plans"
      description="Create complete fee plans with class applicability and multiple fee items from a validated CSV file."
      importTitle="Fee plan import"
      uploadLabel="Upload fee plan CSV"
      entityLabel="Fee Plans"
      endpoint="/api/v1/fee-plans/bulk"
      bodyKey="plans"
      headers={HEADERS}
      sampleRows={SAMPLE_ROWS}
      templateFileName="schooldb-fee-plans-template.csv"
      validateRow={validateFeePlan}
      normalizeRow={(row) => ({
        academicYear: row.academicYear.trim(),
        planName: row.planName.trim(),
        description: row.description.trim(),
        classes: row.classes.trim(),
        feeItems: row.feeItems.trim(),
      })}
      duplicateKey={(row) => `${row.academicYear}:${row.planName}`}
      duplicateLabel="fee plans"
    />
  );
}

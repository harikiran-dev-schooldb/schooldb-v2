import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function pageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return pageFiles(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

test("every web page inherits the application theme scope", () => {
  const pages = pageFiles("src/app");
  const rootLayout = read("src/app/layout.tsx");

  assert.ok(pages.length >= 170, `expected the full route set, found ${pages.length}`);
  assert.match(rootLayout, /<body className="schooldb-theme-scope /);
});

test("legacy light utilities receive semantic dark-mode colors", () => {
  const css = read("src/app/globals.css");

  for (const selector of [
    ".dark .schooldb-theme-scope .bg-white",
    ".dark .schooldb-theme-scope .bg-slate-50",
    ".dark .schooldb-theme-scope .text-slate-950",
    ".dark .schooldb-theme-scope .text-slate-600",
    ".dark .schooldb-theme-scope .border-slate-200",
    ".dark .schooldb-theme-scope .hover\\:bg-slate-50:hover",
    ".dark .schooldb-theme-scope .from-white",
  ]) {
    assert.ok(css.includes(selector), `missing dark-mode bridge for ${selector}`);
  }
});

test("printable school documents remain light in dark mode", () => {
  const printableSources = [
    "src/features/exams/components/StudentYearlyPerformanceReport.tsx",
    "src/features/exams/components/StudentReportCardPage.tsx",
    "src/features/student-fees/components/FeeReceipt.tsx",
    "src/features/students/components/id-cards/StudentIdCard.tsx",
    "src/app/[schoolSlug]/(app)/students/[id]/certificates/[type]/page.tsx",
    "src/app/[schoolSlug]/(app)/admissions/[id]/print/page.tsx",
  ];

  for (const path of printableSources) {
    assert.match(read(path), /theme-force-light/, `${path} must opt out of dark surfaces`);
  }
});

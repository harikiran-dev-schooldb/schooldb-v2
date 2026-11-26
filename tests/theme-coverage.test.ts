import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import test from "node:test";

function read(path: string) { return readFileSync(path,"utf8"); }
function pageFiles(directory: string): string[] {
 return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const path=directory+"/"+entry.name;
  return entry.isDirectory()?pageFiles(path):entry.name==="page.tsx"?[path]:[];
 });
}
test("every web page inherits the locked light root",()=>{
 const root=read("src/app/layout.tsx");
 assert.ok(pageFiles("src/app").length>=170);
 assert.match(root,/<body className="schooldb-theme-scope /);
 assert.match(root,/className="light font-sans antialiased"/);
 assert.match(root,/colorScheme: "light"/);
 assert.match(root,/themeColor: "#f5f7ff"/);
 assert.doesNotMatch(root,/ThemeProvider|prefers-color-scheme|enableSystem/);
});
test("dark colors and appearance controls cannot activate",()=>{
 const css=read("src/app/globals.css");
 assert.match(css,/color-scheme: only light/);
 assert.match(css,/@custom-variant dark \(&:where\(:not\(\*\)\)\)/);
 assert.doesNotMatch(css,/^\s*\.dark\b/m);
 assert.equal(existsSync("src/components/theme/ThemeToggle.tsx"),false);
 for(const path of ["src/components/layout/AppHeader.tsx","src/components/self-service/SelfServiceHeader.tsx"])assert.doesNotMatch(read(path),/ThemeToggle/);
 assert.match(read("src/components/ui/sonner.tsx"),/theme="light"/);
});
test("printable school documents retain light print surfaces",()=>{
 for(const path of [
 "src/features/exams/components/StudentYearlyPerformanceReport.tsx",
 "src/features/exams/components/StudentReportCardPage.tsx",
 "src/features/student-fees/components/FeeReceipt.tsx",
 "src/features/students/components/id-cards/StudentIdCard.tsx",
 "src/app/[schoolSlug]/(app)/students/[id]/certificates/[type]/page.tsx",
 "src/app/[schoolSlug]/(app)/admissions/[id]/print/page.tsx",
 ])assert.match(read(path),/theme-force-light/);
});

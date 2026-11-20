import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { selectTriggerClasses } from "../src/components/ui/select-styles.ts";

test("select and combobox triggers share the premium control dimensions and feedback", () => {
  for (const expected of [
    "h-11",
    "sm:h-10",
    "w-full",
    "rounded-xl",
    "border-input",
    "bg-card",
    "hover:border-primary/25",
    "focus-visible:ring-4",
    "disabled:opacity-50",
  ]) {
    assert.ok(selectTriggerClasses.includes(expected), `Missing shared style ${expected}`);
  }
});

test("Radix and searchable dropdowns use one shared trigger style", () => {
  for (const path of [
    "src/components/ui/select.tsx",
    "src/components/common/combobox/RemoteCombobox.tsx",
    "src/components/common/select/SearchableStudentSelect.tsx",
    "src/features/operations/shared.tsx",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /selectTriggerClasses/, `${path} should share the trigger style`);
    assert.match(source, /ChevronDown/, `${path} should use a single chevron`);
  }
});

test("native selects use the same chevron and focus treatment without replacing native functionality", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /select:not\(\[multiple\]\):not\(\[size\]\)/);
  assert.match(css, /background-image: url\("data:image\/svg\+xml/);
  assert.match(css, /select:not\(\[multiple\]\):not\(\[size\]\):focus-visible/);
});

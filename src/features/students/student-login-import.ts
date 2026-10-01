function csvCells(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function parseStudentLoginAdmissionNumbers(value: string) {
  const lines = value.split(/\r?\n/).filter((line) => line.trim());
  const header = lines[0] ? csvCells(lines[0]) : [];
  const admissionIndex = header.findIndex(
    (item) => item.trim().toLowerCase() === "admissionno",
  );
  const values = admissionIndex >= 0
    ? lines.slice(1).map((line) => csvCells(line)[admissionIndex] ?? "")
    : value
        .split(/[\r\n,;\t]+/)
        .map((item) => item.trim().replace(/^"|"$/g, ""));
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

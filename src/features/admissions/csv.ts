// Protect spreadsheet users from formula injection, including leading whitespace.
export function csvCell(value:unknown){const text=String(value??"");const safe=/^[\s]*[=+@-]|^[\t\r\n]/.test(text)?"'"+text:text;return '"'+safe.replaceAll('"','""')+'"';}
export function csvRows(rows:unknown[][]){return "\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n");}

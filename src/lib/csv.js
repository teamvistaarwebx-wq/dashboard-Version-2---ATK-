/**
 * CSV in and out, in the browser.
 *
 * The parser follows RFC 4180: quoted fields may hold commas, line breaks and
 * doubled quotes; CRLF and LF both end a row; a UTF-8 BOM (Excel's habit) is
 * dropped. Good enough for spreadsheets exported from Excel, Numbers and
 * Google Sheets, which is where product sheets come from.
 */

export function parseCsv(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  // Trailing blank lines are common; a row of empty cells is not data.
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/** Rows as objects keyed by the (trimmed, lower-cased) header row. */
export function parseCsvObjects(text) {
  const [header = [], ...rows] = parseCsv(text);
  const keys = header.map((name) => name.trim().toLowerCase());
  return {
    columns: keys,
    rows: rows.map((cells) => Object.fromEntries(keys.map((key, index) => [key, (cells[index] ?? "").trim()]))),
  };
}

function escapeCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns, rows) {
  const lines = [columns.map((column) => escapeCell(column.label)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCell(column.value(row))).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

/** Saves text as a file. The BOM makes Excel read ₹ and Indian names correctly. */
export function downloadText(filename, text, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿", text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Minimal RFC 4180-ish CSV encoder -- no library needed for this, but the
 * escaping has to be right or a title with a comma/quote/newline in it
 * (very normal for blog post titles) silently corrupts the file's columns
 * when opened in Excel/Sheets.
 */
function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: string[][]): string {
  // CRLF line endings -- the CSV spec's own preference and what Excel
  // expects; \n-only files still open but some spreadsheet apps mis-detect
  // the format without it.
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

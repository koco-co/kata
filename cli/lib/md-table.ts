/**
 * splitMdTableRow — Split a Markdown table row into cells,
 * respecting escaped pipe characters (\|).
 */
export function splitMdTableRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let escaped = false;
  for (const ch of line) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      current += ch;
      escaped = true;
      continue;
    }
    if (ch === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

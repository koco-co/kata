/**
 * Terminal table renderer with continuous box-drawing borders.
 * Cells are wrapped by display width so CJK text keeps the table aligned.
 */

export interface TerminalTableColumn {
  header: string;
  minWidth?: number;
  maxWidth?: number;
}

export interface TerminalTableOptions {
  /** Total display width available for the table, including borders and padding. */
  width?: number;
  columns: readonly TerminalTableColumn[];
  rows: readonly (readonly string[][]);
}

const DEFAULT_WIDTH = 80;
const DEFAULT_COLUMN_MIN_WIDTH = 5;
const DEFAULT_COLUMN_MAX_WIDTH = 46;
const CELL_PADDING = 1;

export function renderTerminalTable(options: TerminalTableOptions): string {
  const width = options.width ?? process.stdout.columns ?? DEFAULT_WIDTH;
  const columns = options.columns;
  const columnCount = columns.length;
  const widths = columns.map((column) => column.maxWidth ?? DEFAULT_COLUMN_MAX_WIDTH);
  const minimums = columns.map((column, index) =>
    Math.min(column.minWidth ?? DEFAULT_COLUMN_MIN_WIDTH, widths[index]),
  );
  const normalizedRows = options.rows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ""),
  );
  const allRows = [columns.map((column) => column.header), ...normalizedRows];
  const naturalWidths = allRows.map((row) =>
    row.map((cell) => Math.max(...cell.split("\n").map((line) => displayWidth(line)), 1)),
  );
  const columnNaturalWidths = columns.map((_, index) =>
    Math.max(...naturalWidths.map((row) => row[index]), 1),
  );
  const borderWidth = columnCount + 1;
  const contentWidth = Math.max(width - borderWidth, columnCount);
  const availableWidth = contentWidth - columnCount * CELL_PADDING * 2;
  const columnWidths = fitWidths(columnNaturalWidths, minimums, widths, availableWidth);

  const wrappedCells = normalizedRows.map((row) =>
    row.map((cell, index) => wrapCell(cell, columnWidths[index])),
  );
  const wrappedHeaders = columns.map((column, index) =>
    wrapCell(column.header, columnWidths[index]),
  );
  const lineHeight = (cells: readonly (readonly string[])[]) =>
    Math.max(...cells.map((cell) => cell.length));
  const headerHeight = lineHeight(wrappedHeaders);

  const top = rowSeparator("┌", "┬", "┐", columnWidths);
  const headerSeparator = rowSeparator("├", "┼", "┤", columnWidths);
  const bottom = rowSeparator("└", "┴", "┘", columnWidths);
  const lines: string[] = [top];

  for (let index = 0; index < headerHeight; index += 1) {
    lines.push(
      renderRow(
        wrappedHeaders.map((cell) => cell[index] ?? ""),
        columnWidths,
      ),
    );
  }
  lines.push(headerSeparator);

  for (const row of wrappedCells) {
    const height = lineHeight(row);
    for (let index = 0; index < height; index += 1) {
      lines.push(
        renderRow(
          row.map((cell) => cell[index] ?? ""),
          columnWidths,
        ),
      );
    }
    lines.push(rowSeparator("├", "┼", "┤", columnWidths));
  }
  lines[lines.length - 1] = bottom;
  return lines.join("\n");
}

function rowSeparator(left: string, middle: string, right: string, widths: readonly number[]) {
  const segment = (width: number) => "─".repeat(width + CELL_PADDING * 2);
  return `${left}${widths.map((width) => segment(width)).join(middle)}${right}`;
}

function renderRow(cells: readonly string[], widths: readonly number[]): string {
  const padded = cells.map(
    (cell, index) =>
      `${" ".repeat(CELL_PADDING)}${padDisplay(cell, widths[index])}${" ".repeat(CELL_PADDING)}`,
  );
  return `│${padded.join("│")}│`;
}

function fitWidths(
  naturalWidths: readonly number[],
  minimums: readonly number[],
  maximums: readonly number[],
  availableWidth: number,
): number[] {
  const requested = naturalWidths.map((value, index) => Math.min(value, maximums[index]));
  const total = requested.reduce((sum, value) => sum + value, 0);
  if (total <= availableWidth) {
    return requested;
  }
  const overflow = total - availableWidth;
  const reduceable = requested
    .map((value, index) => ({ value, index, minimum: minimums[index] }))
    .filter((item) => item.value > item.minimum)
    .sort((left, right) => right.value - left.value);
  let remaining = overflow;
  for (const item of reduceable) {
    if (remaining <= 0) break;
    const removed = Math.min(item.value - item.minimum, remaining);
    requested[item.index] -= removed;
    remaining -= removed;
  }
  return requested;
}

function padDisplay(text: string, width: number): string {
  const missing = width - displayWidth(text);
  return missing > 0 ? text + " ".repeat(missing) : text;
}

function wrapCell(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const line of text.split("\n")) {
    lines.push(...wrapLine(line, width));
  }
  return lines.length > 0 ? lines : [""];
}

function wrapLine(text: string, width: number): string[] {
  const words = splitWords(text);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && displayWidth(line) + displayWidth(word) > width) {
      lines.push(line);
      line = "";
    }
    if (displayWidth(word) > width) {
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(...hardWrap(word, width));
      continue;
    }
    line += word;
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function splitWords(text: string): string[] {
  const words: string[] = [];
  let current = "";
  for (const char of text) {
    if (char === " ") {
      if (current) {
        words.push(current);
        current = "";
      }
      words.push(" ");
      continue;
    }
    const isCjk = displayWidth(char) === 2;
    const isAsciiWord = /[A-Za-z0-9_.@:/\\-]/.test(char);
    if (isCjk || !isAsciiWord) {
      if (current) {
        words.push(current);
        current = "";
      }
      words.push(char);
      continue;
    }
    current += char;
  }
  if (current) words.push(current);
  return words;
}

function hardWrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const char of text) {
    if (line && displayWidth(line) + displayWidth(char) > width) {
      lines.push(line);
      line = "";
    }
    line += char;
  }
  if (line) lines.push(line);
  return lines;
}

export function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += charWidth(char.codePointAt(0) ?? 0);
  }
  return width;
}

function charWidth(codePoint: number): number {
  if (codePoint === 0) return 0;
  if (codePoint < 32 || (codePoint >= 0x7f && codePoint < 0xa0)) return -1;
  if (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    codePoint === 0x2329 ||
    codePoint === 0x232a ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
    (codePoint >= 0x1f900 && codePoint <= 0x1f9ff)
  ) {
    return 2;
  }
  return 1;
}

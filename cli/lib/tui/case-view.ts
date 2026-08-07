import { normalizeStructuredText } from "../cases/normalize.ts";
import type { CaseItem } from "../cases/types.ts";
import { renderTerminalTable, type TerminalTableColumn } from "./terminal-table.ts";

export function caseListLabel(item: CaseItem): string {
  return `【${item.id}】${item.title}`;
}

export function caseDetail(item: CaseItem): string {
  const lines: string[] = [];
  if (item.precondition?.trim()) {
    lines.push("【Precondition】", numberedLines(item.precondition), "");
  }
  lines.push("【Steps】", "", stepsTable(item.steps));
  return lines.join("\n");
}

function numberedLines(text: string): string {
  return normalizeStructuredText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => `${index + 1}) ${line.replace(/^\d+[.)、]\s*/, "")}`)
    .join("\n");
}

function stepsTable(steps: readonly { action: string; expected: string }[]): string {
  const columns: TerminalTableColumn[] = [
    { header: "Num", minWidth: 5, maxWidth: 6 },
    { header: "Action", minWidth: 12, maxWidth: 44 },
    { header: "Expected", minWidth: 10, maxWidth: 44 },
  ];
  return renderTerminalTable({
    columns,
    rows: steps.map((step, index) => [
      String(index + 1),
      normalizeStructuredText(step.action),
      normalizeStructuredText(step.expected),
    ]),
  });
}

export const PAGE_SIZE = 10;
export const LINT_PAGE_SIZE = PAGE_SIZE;

export interface TuiLintViolation {
  rule?: string;
  message: string;
  case_id?: string;
  case_title?: string;
}

/** Lint 结果的可定位范围：优先稳定用例编号，其次是文件，最后是 feature 本身。 */
export function lintScope(violation: TuiLintViolation): string {
  if (violation.case_id) return violation.case_id;
  const file = violation.message.match(/^cases\/[^\s]+/)?.[0];
  return file ?? "Feature";
}

export function lintLabel(violation: TuiLintViolation): string {
  return `${lintScope(violation)} [${violation.rule ?? "-"}]`;
}

export function compactLintText(value: string, max = 72): string {
  const compact = value.replace(/\s*\n\s*/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, Math.max(0, max - 3))}...`;
}

/** 列表页只展示“实际”摘要，完整详情在选中后展示。 */
export function lintSummary(violation: TuiLintViolation): string {
  const actual = violation.message.match(/\n实际：([^\n]+)/)?.[1];
  return actual ? `实际: ${compactLintText(actual, 12)}` : compactLintText(violation.message, 12);
}

export function lintDetail(violation: TuiLintViolation): string {
  return violation.message;
}

export function lintPageCount(count: number): number {
  return Math.max(1, Math.ceil(count / PAGE_SIZE));
}

export function lintPageSlice<T>(items: readonly T[], page: number): T[] {
  const start = page * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

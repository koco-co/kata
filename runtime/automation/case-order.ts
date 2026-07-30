export interface AutomationCaseModule {
  readonly caseId: string;
  readonly module: string;
}

/** Keep YAML order by default; the opt-in mode runs the padded case IDs descending. */
export function orderAutomationCases<T extends AutomationCaseModule>(
  cases: readonly T[],
  sortCases: boolean,
): T[] {
  const ordered = [...cases];
  if (!sortCases) return ordered;
  return ordered.sort((left, right) => right.caseId.localeCompare(left.caseId));
}

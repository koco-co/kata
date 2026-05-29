export const AVAILABLE_HOOKS = {
  "case-draft:init": "Before case-draft skill starts",
  "case-draft:output": "After case-draft produces output",
  "case-hotfix:init": "Before case-hotfix skill starts",
  "case-hotfix:output": "After case-hotfix produces output",
  "bug-file:init": "Before bug-file skill starts",
  "bug-file:output": "After bug-file produces output",
  "conflict-analyze:init": "Before conflict-analyze skill starts",
  "conflict-analyze:output": "After conflict-analyze produces output",
  "*:output": "After any skill produces output (wildcard)",
} as const;

export type HookName = keyof typeof AVAILABLE_HOOKS;

export function isValidHook(hook: string): hook is HookName {
  if (hook.startsWith("*:")) return true;
  return hook in AVAILABLE_HOOKS;
}

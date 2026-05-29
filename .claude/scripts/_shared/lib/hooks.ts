export const AVAILABLE_HOOKS = {
  "case-draft:init": "Before case-draft skill starts",
  "case-draft:output": "After case-draft produces output",
  "case-hotfix:init": "Before case-hotfix skill starts",
  "case-hotfix:output": "After case-hotfix produces output",
  "defect-analyze:init": "Before defect-analyze skill starts",
  "defect-analyze:output": "After defect-analyze produces output",
  "*:output": "After any skill produces output (wildcard)",
} as const;

export type HookName = keyof typeof AVAILABLE_HOOKS;

export function isValidHook(hook: string): hook is HookName {
  if (hook.startsWith("*:")) return true;
  return hook in AVAILABLE_HOOKS;
}

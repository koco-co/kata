import type { KataIssue } from "@shared/lib/result-types.ts";

export type SecretChannel = {
  resolve: (ref: string) => string | undefined;
  listRefs: () => string[];
};

export type SecretSourceEntry = {
  pattern: string;
  env_var: string;
};

export function loadSecretSources(yamlText: string): SecretSourceEntry[] {
  const entries: SecretSourceEntry[] = [];
  const lines = yamlText.split("\n");
  let current: Partial<SecretSourceEntry> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#") || trimmed === "sources:") continue;

    const patternMatch = trimmed.match(/^-\s+pattern:\s*(.+)$/);
    if (patternMatch) {
      if (current.pattern && current.env_var) entries.push(current as SecretSourceEntry);
      current = { pattern: patternMatch[1].trim() };
      continue;
    }

    const envMatch = trimmed.match(/^\s*env_var:\s*(.+)$/);
    if (envMatch && current.pattern) {
      current.env_var = envMatch[1].trim();
    }
  }

  if (current.pattern && current.env_var) {
    entries.push(current as SecretSourceEntry);
  }

  return entries;
}

export function createSecretChannel(
  allowedRefs: string[],
  sources: SecretSourceEntry[],
): SecretChannel {
  const refValues = new Map<string, string>();

  for (const ref of allowedRefs) {
    const source = sources.find((s) => matchSecretPattern(s.pattern, ref));
    if (source && process.env[source.env_var]) {
      refValues.set(ref, process.env[source.env_var]!);
    }
  }

  return {
    resolve(ref: string): string | undefined {
      if (!allowedRefs.some((r) => matchSecretPattern(r, ref))) {
        return undefined;
      }
      return refValues.get(ref);
    },
    listRefs(): string[] {
      return [...refValues.keys()];
    },
  };
}

export function validateSecretRefs(declaredRefs: string[], resolvedKeys: string[]): KataIssue[] {
  const issues: KataIssue[] = [];
  for (const ref of declaredRefs) {
    if (!resolvedKeys.includes(ref)) {
      issues.push({
        code: "secret.unresolved_ref",
        severity: "error",
        message: `Secret ref ${ref} is declared but not resolved from secret sources.`,
        path: "secret_refs",
      });
    }
  }
  return issues;
}

function matchSecretPattern(pattern: string, ref: string): boolean {
  if (pattern.endsWith("*")) {
    return ref.startsWith(pattern.slice(0, -1));
  }
  return pattern === ref;
}

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./paths.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";
import { parseYamlContract, yamlIssues } from "./yaml-contract.ts";

export type LocalContextPolicy = {
  auditedPaths: string[];
  forbiddenPatterns: string[];
};

export type AuditLocalContextTextInput = {
  path: string;
  text: string;
};

const LOCAL_CONTEXT_POLICY_PATH = ".ai/core/context/local-context.yaml";
const LOCAL_CONTEXT_OVERRIDE_MESSAGE =
  "Local context cannot define routing, policy, write-scope, or plugin permissions.";
const DEFAULT_POLICY: LocalContextPolicy = {
  auditedPaths: ["AGENTS.local.md", "CLAUDE.local.md", ".claude/settings.local.json"],
  forbiddenPatterns: [
    "must",
    "never",
    "required",
    "禁止",
    "必须",
    "route to",
    "write scope",
    "write-scope",
    "plugin permission",
    "plugin permissions",
  ],
};

export function auditLocalContextText(input: AuditLocalContextTextInput): AiCoreResult<null> {
  return auditLocalContextTextWithPatterns(input, DEFAULT_POLICY.forbiddenPatterns);
}

export function auditLocalContext(root = repoRoot()): AiCoreResult<null> {
  const policy = loadLocalContextPolicy(root);
  if (!policy.ok) return { ok: false, issues: policy.issues };
  const issues: AiCoreIssue[] = [];

  for (const auditedPath of policy.value?.auditedPaths) {
    const fullPath = join(root, auditedPath);
    if (!existsSync(fullPath)) continue;
    const result = auditLocalContextTextWithPatterns(
      {
        path: auditedPath,
        text: readFileSync(fullPath, "utf8"),
      },
      policy.value?.forbiddenPatterns,
    );
    issues.push(...result.issues);
  }

  return {
    ok: issues.length === 0,
    value: null,
    issues,
  };
}

function loadLocalContextPolicy(root: string): AiCoreResult<LocalContextPolicy> {
  const policyPath = join(root, LOCAL_CONTEXT_POLICY_PATH);
  if (!existsSync(policyPath)) return { ok: true, value: DEFAULT_POLICY, issues: [] };

  const policyText = readFileSync(policyPath, "utf8");
  return loadLocalContextPolicyFromText(policyText, LOCAL_CONTEXT_POLICY_PATH);
}

export function loadLocalContextPolicyFromText(
  text: string,
  path: string,
): AiCoreResult<LocalContextPolicy> {
  const normalized = normalizeLocalContextPolicyText(text, path);
  if (!normalized.ok) return { ok: false, issues: normalized.issues };
  const contract = parseYamlContract(normalized.value ?? "", path);
  const issues = yamlIssues(contract);
  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: {
      auditedPaths: stringListOrDefault(
        contract.lists.get("audited_paths"),
        DEFAULT_POLICY.auditedPaths,
      ),
      forbiddenPatterns: stringListOrDefault(
        contract.lists.get("forbidden_patterns"),
        DEFAULT_POLICY.forbiddenPatterns,
      ),
    },
    issues: [],
  };
}

function stringListOrDefault(value: string[] | undefined, fallback: string[]): string[] {
  if (value && value.length > 0) return value;
  return fallback;
}

function normalizeLocalContextPolicyText(text: string, path: string): AiCoreResult<string> {
  const lines = text.split(/\r?\n/);
  const firstContentLine = lines.find((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("#");
  });
  if (!firstContentLine?.startsWith("local_context:")) return { ok: true, value: text, issues: [] };
  if (firstContentLine.trim() !== "local_context:") {
    return {
      ok: false,
      issues: [
        issue("yaml.unsupported_nested_structure", "local_context must be a mapping.", path),
      ],
    };
  }

  const normalized: string[] = [];
  let insideLocalContext = false;
  for (const [index, raw] of lines.entries()) {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      if (insideLocalContext) normalized.push(raw);
      continue;
    }
    if (!insideLocalContext) {
      if (raw.trim() === "local_context:") {
        insideLocalContext = true;
      }
      continue;
    }
    const leadingWhitespace = raw.match(/^\s*/)?.[0] ?? "";
    if (
      leadingWhitespace.includes("\t") ||
      leadingWhitespace.length < 2 ||
      leadingWhitespace.length % 2 !== 0
    ) {
      return {
        ok: false,
        issues: [
          issue(
            "yaml.unsupported_indentation",
            `Unsupported indentation at line ${lineNumber}.`,
            path,
          ),
        ],
      };
    }
    if (leadingWhitespace.length === 0) {
      return {
        ok: false,
        issues: [
          issue(
            "yaml.unsupported_nested_structure",
            `Unsupported nested structure at line ${lineNumber}.`,
            path,
          ),
        ],
      };
    }
    normalized.push(raw.slice(2));
  }
  return { ok: true, value: normalized.join("\n"), issues: [] };
}

function auditLocalContextTextWithPatterns(
  input: AuditLocalContextTextInput,
  forbiddenPatterns: string[],
): AiCoreResult<null> {
  // Strip human-authored informational sections before pattern checking
  const scrubbed = input.text.replace(
    /<!-- human-authored: informational -->[\s\S]*?(?=## |$)/g,
    "",
  );
  const issues =
    containsForbiddenLocalContextPattern(scrubbed, forbiddenPatterns) ||
    containsPolicyOverride(scrubbed)
      ? [localContextOverrideIssue(input.path)]
      : [];

  return { ok: issues.length === 0, value: null, issues };
}

function containsForbiddenLocalContextPattern(text: string, forbiddenPatterns: string[]): boolean {
  return forbiddenPatterns.some((pattern) => {
    const expression = buildForbiddenPatternExpression(pattern);
    return expression.test(text);
  });
}

function buildForbiddenPatternExpression(pattern: string): RegExp {
  if (/^[a-z][a-z -]*[a-z]$/i.test(pattern)) {
    const separatorAwarePattern = pattern.trim().split(/[ -]+/).map(escapeRegExp).join("[\\s-]+");
    return new RegExp(`\\b${separatorAwarePattern}\\b`, "i");
  }
  return new RegExp(escapeRegExp(pattern), "i");
}

function containsPolicyOverride(text: string): boolean {
  return /\bpolicy\s*(?::|=|-)\s*(?:override|bypass)\b|\bpolicy\s+override\b/i.test(text);
}

function localContextOverrideIssue(path: string): AiCoreIssue {
  return {
    code: "local_context.normative_runtime_override",
    severity: "error",
    message: LOCAL_CONTEXT_OVERRIDE_MESSAGE,
    path,
  };
}

function issue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

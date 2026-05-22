import type { AiCoreIssue } from "../types.ts";

export type SkillReference = {
  path: string;
  type: string; // "normative" | "informative"
  generatedFrom: string;
  loadPhases: string[];
  purpose: string;
  loadWhen: string;
};

export type SkillFewShot = {
  path: string;
  loadPhases: string[];
  purpose: string;
  loadWhen: string;
  maxTokens: number;
};

export type SkillSection = {
  id: string;
  loadWhen: string;
  summary: string;
};

export type SkillInput = {
  name: string;
  required: string;
  kind: string;
  schema: string;
};

export type SkillCommandAlias = {
  name: string;
  userInvocable: string;
  lifecycle: string;
  sinceVersion: string;
  reason: string;
  removeAfter: string;
};

export type ProductSkillProjectionContract = {
  name: string;
  summary: string;
  mustTriggerWhen: string[];
  mustNotTriggerWhen: string[];
  outputs: string[];
  allowedTools: string[];
  contextBudgetLines: string[];
  alwaysLoad: string[];
  routingSummary: string[];
  sections: SkillSection[];
  inputs: SkillInput[];
  commandAliases: SkillCommandAlias[];
  loadWhen: Array<{ path: string; condition: string }>;
  hardRules: string[];
  references: SkillReference[];
  fewShots: SkillFewShot[];
  evidencePolicy: Record<string, string | string[]>;
  failurePolicy: Record<string, string | string[]>;
  codexOverrides: {
    routingSummary: string[];
    hardRules: string[];
  };
};

export type ProductSkillParserScope =
  | { kind: "map"; path: string[]; childIndent: number; seenKeys: Set<string> }
  | { kind: "list"; path: string[]; childIndent: number }
  | {
      kind: "row-field-list";
      path: string[];
      childIndent: number;
      field: string;
      value: Record<string, string | string[]>;
    }
  | { kind: "row-list"; path: string[]; childIndent: number }
  | {
      kind: "row";
      path: string[];
      childIndent: number;
      seenKeys: Set<string>;
      value: Record<string, string | string[]>;
    };

export type ParsedKeyValue =
  | { ok: true; key: string; value: string }
  | { ok: false; issue: AiCoreIssue };

export type ParsedScalar = { ok: true; value: string } | { ok: false; issue: AiCoreIssue };

export const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
export const PHASE_PATTERN = /^[a-z][a-z0-9_-]*$/;
export const MAX_REFERENCE_PURPOSE_LENGTH = 160;
export const DESCRIPTION_WORKFLOW_PATTERN =
  /(先|然后|步骤|执行顺序|workflow|读取|输出|禁止|必须|不得|工具|调用)/i;

export function issue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}

export function pathKey(path: string[]): string {
  return path.join(".");
}

export function stringField(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export function stringListField(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

export function isSafeReferencePath(path: string): boolean {
  if (!path.startsWith("references/")) return false;
  if (path.includes("\\") || path.includes("\0")) return false;
  if (path.includes("../") || path.startsWith("../")) return false;
  return path !== "references/" && path !== "references";
}

export function validateLoadPhases(phases: string[]): boolean {
  return phases.length > 0 && phases.every((phase) => PHASE_PATTERN.test(phase));
}

export function validatePurpose(purpose: string): boolean {
  return purpose.length > 0 && purpose.length <= MAX_REFERENCE_PURPOSE_LENGTH;
}

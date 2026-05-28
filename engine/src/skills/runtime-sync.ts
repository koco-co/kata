import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";
import YAML from "yaml";

import { findUnsupportedFrontmatterFields, type SkillRuntime } from "./frontmatter-policy.ts";

export type RuntimeSkillViolationRule =
  | "RUNTIME_SKILL_MISSING"
  | "SKILL_MD_MISSING"
  | "FRONTMATTER_PARSE_ERROR"
  | "SKILL_NAME_MISSING"
  | "SKILL_NAME_MISMATCH"
  | "SKILL_DESCRIPTION_MISSING"
  | "UNSUPPORTED_FRONTMATTER"
  | "DECORATIVE_CONTRACT_SECTION"
  | "CODEX_OPENAI_CONFIG_MISSING"
  | "CODEX_OPENAI_CONFIG_PARSE_ERROR"
  | "CODEX_OPENAI_CONFIG_INVALID";

export type RuntimeSkillViolation = {
  rule: RuntimeSkillViolationRule;
  side?: SkillRuntime;
  skill: string;
  path: string;
  message: string;
};

export type RuntimeSkillSyncReport = {
  passed: boolean;
  violations: RuntimeSkillViolation[];
};

type RuntimeSkillRecord = {
  dirName: string;
};

const RUNTIME_DIRS: Record<SkillRuntime, ".claude" | ".agents"> = {
  claude: ".claude",
  codex: ".agents",
};

const DECORATIVE_CONTRACT_PATTERNS = [
  /^## 输出$/m,
  /^## 输入$/m,
  /^## 允许的工具$/m,
  /^## 上下文预算$/m,
  /^## 调用图$/m,
  /^## 证据策略$/m,
  /^## 失败策略$/m,
  /\bcore_tokens:/,
  /\breference_tokens:/,
  /\bevidence_tokens:/,
  /\boverflow_policy:/,
  /\bsource_refs_required:/,
  /\bstale_ref_policy:/,
  /下游 agents:/,
  /下游 prompts:/,
  /-worker@1/,
  /-prompt@1/,
] as const;

export function checkRuntimeSkillSync(root: string): RuntimeSkillSyncReport {
  const violations: RuntimeSkillViolation[] = [];
  const records: Record<SkillRuntime, RuntimeSkillRecord[]> = {
    claude: readRuntimeSkills(root, "claude", violations),
    codex: readRuntimeSkills(root, "codex", violations),
  };

  const claudeNames = new Set(records.claude.map((record) => record.dirName));
  const codexNames = new Set(records.codex.map((record) => record.dirName));

  for (const name of [...claudeNames].sort()) {
    if (!codexNames.has(name)) {
      violations.push({
        rule: "RUNTIME_SKILL_MISSING",
        side: "codex",
        skill: name,
        path: join(".agents", "skills", name),
        message: `missing Codex counterpart for Claude skill ${name}`,
      });
    }
  }

  for (const name of [...codexNames].sort()) {
    if (!claudeNames.has(name)) {
      violations.push({
        rule: "RUNTIME_SKILL_MISSING",
        side: "claude",
        skill: name,
        path: join(".claude", "skills", name),
        message: `missing Claude counterpart for Codex skill ${name}`,
      });
    }
  }

  return { passed: violations.length === 0, violations };
}

function readRuntimeSkills(
  root: string,
  side: SkillRuntime,
  violations: RuntimeSkillViolation[],
): RuntimeSkillRecord[] {
  const skillsRoot = join(root, RUNTIME_DIRS[side], "skills");
  if (!existsSync(skillsRoot)) return [];

  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readRuntimeSkill(root, side, entry.name, violations));
}

function readRuntimeSkill(
  root: string,
  side: SkillRuntime,
  dirName: string,
  violations: RuntimeSkillViolation[],
): RuntimeSkillRecord {
  const skillPath = join(root, RUNTIME_DIRS[side], "skills", dirName, "SKILL.md");
  const displayPath = relative(root, skillPath);
  const record = { dirName };

  if (!existsSync(skillPath)) {
    pushRuntimeViolation(
      violations,
      "SKILL_MD_MISSING",
      side,
      dirName,
      displayPath,
      "SKILL.md is missing",
    );
    return record;
  }

  const parsed = readSkillFrontmatter(skillPath, side, dirName, displayPath, violations);
  if (!parsed) return record;

  validateSkillFrontmatter(side, dirName, displayPath, parsed, violations);
  validateNoDecorativeContractSections(side, dirName, displayPath, parsed.content, violations);
  if (side === "codex") checkCodexOpenAiConfig(root, dirName, violations);
  return record;
}

function readSkillFrontmatter(
  skillPath: string,
  side: SkillRuntime,
  dirName: string,
  displayPath: string,
  violations: RuntimeSkillViolation[],
): matter.GrayMatterFile<string> | undefined {
  try {
    return matter(readFileSync(skillPath, "utf8"));
  } catch (error) {
    pushRuntimeViolation(
      violations,
      "FRONTMATTER_PARSE_ERROR",
      side,
      dirName,
      displayPath,
      `frontmatter parse failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function validateSkillFrontmatter(
  side: SkillRuntime,
  dirName: string,
  displayPath: string,
  parsed: matter.GrayMatterFile<string>,
  violations: RuntimeSkillViolation[],
): void {
  validateSkillName(side, dirName, displayPath, parsed.data.name, violations);
  validateSkillDescription(side, dirName, displayPath, parsed.data.description, violations);
  validateSupportedFrontmatterFields(side, dirName, displayPath, parsed.data, violations);
}

function validateSkillName(
  side: SkillRuntime,
  dirName: string,
  displayPath: string,
  frontmatterName: unknown,
  violations: RuntimeSkillViolation[],
): void {
  if (typeof frontmatterName !== "string" || frontmatterName.trim() === "") {
    pushRuntimeViolation(
      violations,
      "SKILL_NAME_MISSING",
      side,
      dirName,
      displayPath,
      "frontmatter name is required",
    );
  } else if (frontmatterName !== dirName) {
    pushRuntimeViolation(
      violations,
      "SKILL_NAME_MISMATCH",
      side,
      dirName,
      displayPath,
      `frontmatter name ${frontmatterName} does not match skill directory ${dirName}`,
    );
  }
}

function validateSkillDescription(
  side: SkillRuntime,
  dirName: string,
  displayPath: string,
  frontmatterDescription: unknown,
  violations: RuntimeSkillViolation[],
): void {
  if (typeof frontmatterDescription !== "string" || frontmatterDescription.trim() === "") {
    pushRuntimeViolation(
      violations,
      "SKILL_DESCRIPTION_MISSING",
      side,
      dirName,
      displayPath,
      "frontmatter description is required",
    );
  }
}

function validateSupportedFrontmatterFields(
  side: SkillRuntime,
  dirName: string,
  displayPath: string,
  data: Record<string, unknown>,
  violations: RuntimeSkillViolation[],
): void {
  const unsupportedFields = findUnsupportedFrontmatterFields(side, data);
  if (unsupportedFields.length > 0) {
    pushRuntimeViolation(
      violations,
      "UNSUPPORTED_FRONTMATTER",
      side,
      dirName,
      displayPath,
      `unsupported frontmatter fields: ${unsupportedFields.join(", ")}`,
    );
  }
}

function validateNoDecorativeContractSections(
  side: SkillRuntime,
  dirName: string,
  displayPath: string,
  content: string,
  violations: RuntimeSkillViolation[],
): void {
  const matched = DECORATIVE_CONTRACT_PATTERNS.find((pattern) => pattern.test(content));
  if (!matched) return;

  pushRuntimeViolation(
    violations,
    "DECORATIVE_CONTRACT_SECTION",
    side,
    dirName,
    displayPath,
    `SKILL.md still contains decorative contract text (${String(matched)}); move enforceable rules to workflow, blackboard, references, or runtime-native config`,
  );
}

function checkCodexOpenAiConfig(
  root: string,
  dirName: string,
  violations: RuntimeSkillViolation[],
): void {
  const configPath = join(root, ".agents", "skills", dirName, "agents", "openai.yaml");
  const displayPath = relative(root, configPath);

  if (!existsSync(configPath)) {
    pushRuntimeViolation(
      violations,
      "CODEX_OPENAI_CONFIG_MISSING",
      "codex",
      dirName,
      displayPath,
      "Codex agents/openai.yaml is required",
    );
    return;
  }

  const parsed = readCodexOpenAiConfig(configPath, dirName, displayPath, violations);
  if (parsed === undefined) return;

  validateCodexOpenAiPolicy(parsed, dirName, displayPath, violations);
}

function readCodexOpenAiConfig(
  configPath: string,
  dirName: string,
  displayPath: string,
  violations: RuntimeSkillViolation[],
): unknown {
  try {
    return YAML.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    pushRuntimeViolation(
      violations,
      "CODEX_OPENAI_CONFIG_PARSE_ERROR",
      "codex",
      dirName,
      displayPath,
      `failed to parse openai.yaml: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function validateCodexOpenAiPolicy(
  parsed: unknown,
  dirName: string,
  displayPath: string,
  violations: RuntimeSkillViolation[],
): void {
  const policy =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as { policy?: unknown }).policy
      : undefined;
  const allowImplicitInvocation =
    policy && typeof policy === "object" && !Array.isArray(policy)
      ? (policy as { allow_implicit_invocation?: unknown }).allow_implicit_invocation
      : undefined;

  if (typeof allowImplicitInvocation !== "boolean") {
    pushRuntimeViolation(
      violations,
      "CODEX_OPENAI_CONFIG_INVALID",
      "codex",
      dirName,
      displayPath,
      "policy.allow_implicit_invocation must be a boolean",
    );
  }
}

function pushRuntimeViolation(
  violations: RuntimeSkillViolation[],
  rule: RuntimeSkillViolationRule,
  side: SkillRuntime | undefined,
  skill: string,
  path: string,
  message: string,
): void {
  violations.push({ rule, side, skill, path, message });
}

export function formatRuntimeSkillSyncReport(report: RuntimeSkillSyncReport, root: string): string {
  if (report.passed) return "runtime skill sync passed";

  return [
    "runtime skill sync failed",
    ...report.violations.map((violation) => {
      const path = violation.path.startsWith(root)
        ? relative(root, violation.path)
        : violation.path;
      return `${violation.rule} ${path} ${violation.message}`;
    }),
  ].join("\n");
}

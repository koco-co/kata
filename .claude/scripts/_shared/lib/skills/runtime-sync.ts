import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";

import { findUnsupportedFrontmatterFields } from "./frontmatter-policy.ts";

export type RuntimeSkillViolationRule =
  | "RUNTIME_SKILL_MISSING"
  | "SKILL_MD_MISSING"
  | "FRONTMATTER_PARSE_ERROR"
  | "SKILL_NAME_MISSING"
  | "SKILL_NAME_MISMATCH"
  | "SKILL_DESCRIPTION_MISSING"
  | "UNSUPPORTED_FRONTMATTER"
  | "DECORATIVE_CONTRACT_SECTION";

export type RuntimeSkillViolation = {
  rule: RuntimeSkillViolationRule;
  side?: "claude";
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
  readRuntimeSkills(root, violations);
  return { passed: violations.length === 0, violations };
}

function readRuntimeSkills(root: string, violations: RuntimeSkillViolation[]): RuntimeSkillRecord[] {
  const skillsRoot = join(root, ".claude", "skills");
  if (!existsSync(skillsRoot)) return [];

  // 过滤 `_` 前缀目录（如 `_shared/`），它们是聚合资源目录，不是 skill
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => readRuntimeSkill(root, entry.name, violations));
}

function readRuntimeSkill(
  root: string,
  dirName: string,
  violations: RuntimeSkillViolation[],
): RuntimeSkillRecord {
  const skillPath = join(root, ".claude", "skills", dirName, "SKILL.md");
  const displayPath = relative(root, skillPath);
  const record = { dirName };

  if (!existsSync(skillPath)) {
    pushRuntimeViolation(
      violations,
      "SKILL_MD_MISSING",
      dirName,
      displayPath,
      "SKILL.md is missing",
    );
    return record;
  }

  const parsed = readSkillFrontmatter(skillPath, dirName, displayPath, violations);
  if (!parsed) return record;

  validateSkillFrontmatter(dirName, displayPath, parsed, violations);
  validateNoDecorativeContractSections(dirName, displayPath, parsed.content, violations);
  return record;
}

function readSkillFrontmatter(
  skillPath: string,
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
      dirName,
      displayPath,
      `frontmatter parse failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function validateSkillFrontmatter(
  dirName: string,
  displayPath: string,
  parsed: matter.GrayMatterFile<string>,
  violations: RuntimeSkillViolation[],
): void {
  validateSkillName(dirName, displayPath, parsed.data.name, violations);
  validateSkillDescription(dirName, displayPath, parsed.data.description, violations);
  validateSupportedFrontmatterFields(dirName, displayPath, parsed.data, violations);
}

function validateSkillName(
  dirName: string,
  displayPath: string,
  frontmatterName: unknown,
  violations: RuntimeSkillViolation[],
): void {
  if (typeof frontmatterName !== "string" || frontmatterName.trim() === "") {
    pushRuntimeViolation(
      violations,
      "SKILL_NAME_MISSING",
      dirName,
      displayPath,
      "frontmatter name is required",
    );
  } else if (frontmatterName !== dirName) {
    pushRuntimeViolation(
      violations,
      "SKILL_NAME_MISMATCH",
      dirName,
      displayPath,
      `frontmatter name ${frontmatterName} does not match skill directory ${dirName}`,
    );
  }
}

function validateSkillDescription(
  dirName: string,
  displayPath: string,
  frontmatterDescription: unknown,
  violations: RuntimeSkillViolation[],
): void {
  if (typeof frontmatterDescription !== "string" || frontmatterDescription.trim() === "") {
    pushRuntimeViolation(
      violations,
      "SKILL_DESCRIPTION_MISSING",
      dirName,
      displayPath,
      "frontmatter description is required",
    );
  }
}

function validateSupportedFrontmatterFields(
  dirName: string,
  displayPath: string,
  data: Record<string, unknown>,
  violations: RuntimeSkillViolation[],
): void {
  const unsupportedFields = findUnsupportedFrontmatterFields(data);
  if (unsupportedFields.length > 0) {
    pushRuntimeViolation(
      violations,
      "UNSUPPORTED_FRONTMATTER",
      dirName,
      displayPath,
      `unsupported frontmatter fields: ${unsupportedFields.join(", ")}`,
    );
  }
}

function validateNoDecorativeContractSections(
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
    dirName,
    displayPath,
    `SKILL.md still contains decorative contract text (${String(matched)}); move enforceable rules to workflow, blackboard, references, or runtime-native config`,
  );
}

function pushRuntimeViolation(
  violations: RuntimeSkillViolation[],
  rule: RuntimeSkillViolationRule,
  skill: string,
  path: string,
  message: string,
): void {
  violations.push({ rule, side: "claude", skill, path, message });
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

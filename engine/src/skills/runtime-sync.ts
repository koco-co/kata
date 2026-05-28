import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";

import { findUnsupportedFrontmatterFields, type SkillRuntime } from "./frontmatter-policy.ts";

export type RuntimeSkillViolationRule =
  | "RUNTIME_SKILL_MISSING"
  | "SKILL_MD_MISSING"
  | "FRONTMATTER_PARSE_ERROR"
  | "SKILL_NAME_MISSING"
  | "SKILL_NAME_MISMATCH"
  | "UNSUPPORTED_FRONTMATTER";

export type RuntimeSkillViolation = {
  rule: RuntimeSkillViolationRule;
  side: SkillRuntime;
  skill: string;
  path: string;
  message: string;
};

export type RuntimeSkillSyncReport = {
  passed: boolean;
  violations: RuntimeSkillViolation[];
};

export type RuntimeSyncExceptionEntry = {
  skill: string;
  side: SkillRuntime;
  file: string;
  reason: string;
  reviewer: "required-before-merge";
};

type RuntimeSkillRecord = {
  dirName: string;
};

const RUNTIME_DIRS: Record<SkillRuntime, ".claude" | ".agents"> = {
  claude: ".claude",
  codex: ".agents",
};

const BLOCKED_REASON_PATTERNS = [
  /\buser\b/i,
  /\bsemantic/i,
  /\bbehaviou?r/i,
  /\boutput\b/i,
  /\bartifact/i,
  /\bproduct\b/i,
  /\bverification\b/i,
  /\bvalidation\b/i,
  /\bscope\b/i,
  /\bdelivery\b/i,
  /交付/,
  /产物/,
  /验证/,
  /语义/,
];

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
    violations.push({
      rule: "SKILL_MD_MISSING",
      side,
      skill: dirName,
      path: displayPath,
      message: "SKILL.md is missing",
    });
    return record;
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(readFileSync(skillPath, "utf8"));
  } catch (error) {
    violations.push({
      rule: "FRONTMATTER_PARSE_ERROR",
      side,
      skill: dirName,
      path: displayPath,
      message: `frontmatter parse failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return record;
  }

  const frontmatterName = parsed.data.name;
  if (typeof frontmatterName !== "string" || frontmatterName.trim() === "") {
    violations.push({
      rule: "SKILL_NAME_MISSING",
      side,
      skill: dirName,
      path: displayPath,
      message: "frontmatter name is required",
    });
  } else if (frontmatterName !== dirName) {
    violations.push({
      rule: "SKILL_NAME_MISMATCH",
      side,
      skill: dirName,
      path: displayPath,
      message: `frontmatter name ${frontmatterName} does not match skill directory ${dirName}`,
    });
  }

  const unsupportedFields = findUnsupportedFrontmatterFields(side, parsed.data);
  if (unsupportedFields.length > 0) {
    violations.push({
      rule: "UNSUPPORTED_FRONTMATTER",
      side,
      skill: dirName,
      path: displayPath,
      message: `unsupported frontmatter fields: ${unsupportedFields.join(", ")}`,
    });
  }

  return record;
}

// Exported now so Phase 2 can wire exception validation into the repository check.
export function validateExceptionEntry(
  entry: Partial<Record<keyof RuntimeSyncExceptionEntry, unknown>>,
): string[] {
  const errors: string[] = [];

  if (!isPresentString(entry.skill)) errors.push("skill is required");
  if (!isPresentString(entry.side)) errors.push("side is required");
  if (!isPresentString(entry.file)) errors.push("file is required");
  if (!isPresentString(entry.reason)) errors.push("reason is required");
  if (!isPresentString(entry.reviewer)) errors.push("reviewer is required");

  if (isPresentString(entry.side) && entry.side !== "claude" && entry.side !== "codex") {
    errors.push("side must be claude or codex");
  }

  if (isPresentString(entry.reviewer) && entry.reviewer !== "required-before-merge") {
    errors.push("reviewer must be required-before-merge");
  }

  if (
    isPresentString(entry.reason) &&
    BLOCKED_REASON_PATTERNS.some((pattern) => pattern.test(entry.reason))
  ) {
    errors.push("reason cannot waive user semantics, output artifacts, or verification scope");
  }

  return errors;
}

function isPresentString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
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

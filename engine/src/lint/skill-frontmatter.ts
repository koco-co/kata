import { readFileSync } from "node:fs";
import type { AgentRuntime } from "@shared/lib/paths.ts";
import matter from "gray-matter";
import type { SkillReport, SkillViolation } from "./types.ts";

const REF_LINK_REGEX_BY_RUNTIME: Record<AgentRuntime, RegExp> = {
  claude: /\.claude\/skills\/([a-z0-9-]+)\/references\/[^\s)`'"]+/g,
  codex: /\.agents\/skills\/([a-z0-9-]+)\/references\/[^\s)`'"]+/g,
};

export function lintAgentFrontmatter(
  filePath: string,
  knownSkills: Set<string>,
  opts: { runtime?: AgentRuntime } = {},
): SkillReport {
  const violations: SkillViolation[] = [];
  const raw = readFileSync(filePath, "utf8");
  const runtime = opts.runtime ?? "claude";
  let parsed;
  try {
    parsed = matter(raw);
  } catch {
    violations.push({
      rule: "A1",
      skillDir: filePath,
      path: filePath,
      message: "frontmatter parse error",
    });
    return { skillDir: filePath, violations, passed: false };
  }
  // A1: frontmatter present
  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    violations.push({ rule: "A1", skillDir: filePath, path: filePath, message: "no frontmatter" });
  }
  const owner = parsed.data?.owner_skill;
  // A2: owner_skill declared
  if (!owner || typeof owner !== "string") {
    violations.push({
      rule: "A2",
      skillDir: filePath,
      path: filePath,
      message: "owner_skill not declared",
    });
  } else if (!knownSkills.has(owner)) {
    // A3: owner_skill matches known skill
    violations.push({
      rule: "A3",
      skillDir: filePath,
      path: filePath,
      message: `owner_skill '${owner}' is not a known skill`,
    });
  } else {
    // A4: reference-scope check — links must point within owner_skill
    let m: RegExpExecArray | null;
    const refRe = new RegExp(REF_LINK_REGEX_BY_RUNTIME[runtime].source, "g");
    while ((m = refRe.exec(parsed.content)) !== null) {
      const referencedSkill = m[1]!;
      if (referencedSkill !== owner) {
        violations.push({
          rule: "A4",
          skillDir: filePath,
          path: filePath,
          message: `cross-skill reference: links to '${referencedSkill}' but owner_skill is '${owner}'`,
        });
      }
    }
  }
  if (runtime === "codex") {
    const preferred = parsed.data?.preferred_agent_type;
    if (
      preferred !== undefined &&
      preferred !== "worker" &&
      preferred !== "explorer" &&
      preferred !== "default"
    ) {
      violations.push({
        rule: "A5",
        skillDir: filePath,
        path: filePath,
        message: `preferred_agent_type '${preferred}' must be worker, explorer, or default`,
      });
    }

    const sourceHash = parsed.data?.source_hash;
    if (sourceHash !== undefined) {
      const isValidHash =
        typeof sourceHash === "string" && /^sha256:[a-f0-9]{64}$/.test(sourceHash);
      if (!isValidHash) {
        violations.push({
          rule: "A6",
          skillDir: filePath,
          path: filePath,
          message: "source_hash must match sha256:<64 lowercase hex chars>",
        });
      }
    }
  }
  return { skillDir: filePath, violations, passed: violations.length === 0 };
}

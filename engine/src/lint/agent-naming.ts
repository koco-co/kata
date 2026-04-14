import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { AgentReport, AgentViolation } from "./types.ts";

const FORBIDDEN = /^subagent-[a-z]+(?:-agent)?\.md$/;

function walk(dir: string, out: string[]): void {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p, out);
      else if (entry.isFile() && p.endsWith(".md")) out.push(p);
    }
  } catch {
    /* skip inaccessible */
  }
}

export function lintAgentNaming(scanPath: string): AgentReport {
  const files: string[] = [];
  walk(scanPath, files);
  const violations: AgentViolation[] = [];
  for (const file of files) {
    const name = basename(file);
    if (FORBIDDEN.test(name)) {
      violations.push({
        rule: "N1",
        file,
        matched: name,
        message:
          "Agent file name uses opaque `subagent-*` pattern; rename to a verb-led role name (script-writer-agent, regression-runner-agent, etc.)",
      });
    }
  }
  return { scanRoot: scanPath, agents: files.length, violations, passed: violations.length === 0 };
}

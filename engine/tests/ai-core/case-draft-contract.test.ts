import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";

function section(md: string, heading: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++)
    if (/^#{1,3}\s/.test(lines[i])) {
      end = i;
      break;
    }
  return lines
    .slice(start + 1, end)
    .join("\n")
    .trim();
}

describe("case-draft contract parity", () => {
  const claude = readFileSync(join(repoRoot(), ".claude/skills/case-draft/SKILL.md"), "utf-8");
  const codex = readFileSync(join(repoRoot(), ".agents/skills/case-draft/SKILL.md"), "utf-8");

  it("routing summaries are identical across runtimes", () => {
    expect(section(codex, "## 路由摘要")).toBe(section(claude, "## 路由摘要"));
  });
  it("both include the source-confirm step", () => {
    expect(claude).toContain("source-confirm");
    expect(codex).toContain("source-confirm");
  });
  it("neither hardcodes the english-slug path template", () => {
    expect(claude).not.toContain("{YYYY-MM-english-slug}");
    expect(codex).not.toContain("{YYYY-MM-english-slug}");
  });

  it("does not instruct models to implement slug fallback or write metadata notes", () => {
    expect(claude).not.toContain("metadata.yaml notes");
    expect(codex).not.toContain("metadata.yaml notes");
    expect(claude).not.toContain("feature 目录 slug：含中文");
    expect(codex).not.toContain("feature 目录 slug：含中文");
  });

  it("both runtimes' execution-protocol invokes the engine for the path (Gap 4)", () => {
    const claudeEp = readFileSync(
      join(repoRoot(), ".claude/skills/case-draft/references/execution-protocol.md"),
      "utf-8",
    );
    const codexEp = readFileSync(
      join(repoRoot(), ".agents/skills/case-draft/references/execution-protocol.md"),
      "utf-8",
    );
    expect(claudeEp).toContain("kata features resolve");
    expect(codexEp).toContain("kata features resolve");
  });
});

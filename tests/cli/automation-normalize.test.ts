import { describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupDir, normalizeAutomation } from "../../cli/lib/automation-normalize.ts";

function feature(): string {
  return mkdtempSync(join(tmpdir(), "kata-auto-normalize-"));
}

describe("automation normalize", () => {
  it("dry-runs and applies data/sql/root runner migration", () => {
    const root = feature();
    mkdirSync(join(root, "automation", "tests", "data"), { recursive: true });
    mkdirSync(join(root, "automation", "sql"), { recursive: true });
    mkdirSync(join(root, "automation", "tests", "runners"), { recursive: true });
    writeFileSync(join(root, "automation", "tests", "data", "fixture.ts"), "export {};\n");
    writeFileSync(join(root, "automation", "sql", "setup.sql"), "select 1;\n");
    writeFileSync(join(root, "automation", "tests", "smoke.spec.ts"), 'import "x";\n');
    const dry = normalizeAutomation(root, { dryRun: true });
    expect(dry.moved.length).toBe(3);
    const applied = normalizeAutomation(root, { apply: true });
    expect(applied.unfixable).toHaveLength(0);
    expect(readdirSync(join(root, "automation", "tests", "fixtures"))).toContain("fixture.ts");
    expect(readdirSync(join(root, "automation", "tests", "sql"))).toContain("setup.sql");
    expect(readdirSync(join(root, "automation", "tests", "runners"))).toContain("smoke.spec.ts");
  });

  it("keeps canonical runners and moves stray runner files to backup", () => {
    const root = feature();
    const runners = join(root, "automation", "tests", "runners");
    mkdirSync(runners, { recursive: true });
    for (const name of ["generated.ts", "full.spec.ts", "smoke.spec.ts", "retry-failed.spec.ts"]) {
      writeFileSync(join(runners, name), 'import "x";\n');
    }
    writeFileSync(join(runners, "legacy.spec.ts"), 'import "x";\n');
    writeFileSync(join(runners, "notes.md"), "# note\n");

    const applied = normalizeAutomation(root, { apply: true });
    expect(applied.unfixable).toHaveLength(0);
    expect(applied.violations).toBe(2);
    const remaining = readdirSync(runners).sort();
    expect(remaining).toEqual([
      "full.spec.ts",
      "generated.ts",
      "retry-failed.spec.ts",
      "smoke.spec.ts",
    ]);
    const backupRunners = readdirSync(join(applied.backupDir, "runners")).sort();
    expect(backupRunners).toEqual(["legacy.spec.ts", "notes.md"]);
  });

  it("moves stray md/json/yml automation-top files to backup without overwriting conflicts", () => {
    const root = feature();
    const now = new Date("2026-07-27T02:00:00Z");
    mkdirSync(join(root, "automation"), { recursive: true });
    writeFileSync(join(root, "automation", "handoff.yml"), "a: 1\n");
    writeFileSync(join(root, "automation", "notes.md"), "new\n");
    // 预占备份目标：notes.md 触发冲突，handoff.yml 正常移入
    const conflict = join(backupDir(root, now), "automation", "notes.md");
    mkdirSync(join(backupDir(root, now), "automation"), { recursive: true });
    writeFileSync(conflict, "original\n");

    const applied = normalizeAutomation(root, { apply: true, now });
    expect(applied.unfixable).toHaveLength(1);
    expect(applied.unfixable[0]?.reason).toContain("拒绝覆盖");
    // 冲突文件留在原地，备份内容不被覆盖
    expect(existsSync(join(root, "automation", "notes.md"))).toBe(true);
    expect(readFileSync(conflict, "utf8")).toBe("original\n");
    expect(applied.moved.map((m) => m.from)).toEqual([join(root, "automation", "handoff.yml")]);
    expect(readFileSync(join(backupDir(root, now), "automation", "handoff.yml"), "utf8")).toBe(
      "a: 1\n",
    );
  });

  it("allows requirement-notes.md and test-points.md at the metadata-free feature root", () => {
    const root = feature();
    writeFileSync(join(root, "prd.md"), "# prd\n");
    writeFileSync(join(root, "requirement-notes.md"), "# notes\n");
    writeFileSync(join(root, "test-points.md"), "# points\n");

    const report = normalizeAutomation(root, { dryRun: true });
    expect(report.violations).toBe(0);
    expect(report.unfixable).toHaveLength(0);
  });
});

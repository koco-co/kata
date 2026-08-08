import { describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupDir, normalizeAutomation } from "../../cli/lib/automation/automation-normalize.ts";

function feature(): string {
  return mkdtempSync(join(tmpdir(), "kata-auto-normalize-"));
}

describe("automation normalize", () => {
  it("does not follow a symlinked data directory during migration", () => {
    const root = feature();
    const outside = mkdtempSync(join(tmpdir(), "kata-auto-normalize-outside-"));
    writeFileSync(join(outside, "outside.ts"), "export {};");
    mkdirSync(join(root, "automation", "tests"), { recursive: true });
    symlinkSync(outside, join(root, "automation", "tests", "data"));

    const report = normalizeAutomation(root, { apply: true });
    expect(report.unfixable[0]?.reason).toContain("拒绝跟随符号链接");
    expect(existsSync(join(outside, "outside.ts"))).toBe(true);
    expect(existsSync(join(root, "automation", "tests", "data"))).toBe(true);
  });

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
    writeFileSync(join(runners, "full-a.spec.ts"), 'import "x";\n');
    writeFileSync(join(runners, "legacy.spec.ts"), 'import "x";\n');
    writeFileSync(join(runners, "notes.md"), "# note\n");

    const applied = normalizeAutomation(root, { apply: true });
    expect(applied.unfixable).toHaveLength(0);
    expect(applied.violations).toBe(2);
    const remaining = readdirSync(runners).sort();
    expect(remaining).toEqual([
      "full-a.spec.ts",
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

  it("keeps canonical prd and cases directories at the metadata-free feature root", () => {
    const root = feature();
    mkdirSync(join(root, "prd"), { recursive: true });
    mkdirSync(join(root, "cases"), { recursive: true });
    writeFileSync(join(root, "prd", "prd.md"), "# prd\n");
    writeFileSync(join(root, "cases", "test-points.md"), "# points\n");

    const report = normalizeAutomation(root, { dryRun: true });
    expect(report.violations).toBe(0);
    expect(report.unfixable).toHaveLength(0);
  });

  it("reports macOS metadata files at the feature root instead of allowing them", () => {
    const root = feature();
    writeFileSync(join(root, ".DS_Store"), "metadata\n");

    const report = normalizeAutomation(root, { dryRun: true });
    expect(report.violations).toBe(1);
    expect(report.unfixable[0]?.path).toBe(join(root, ".DS_Store"));
    expect(report.unfixable[0]?.reason).toContain("macOS 元数据文件");
  });
});

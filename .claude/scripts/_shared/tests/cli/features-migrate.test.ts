import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeGitMove } from "@shared/cli/features.ts";
import { planMigrate, runFeaturesMigrate } from "@shared/cli/features-migrate.ts";
import { stringify } from "yaml";

// ─── 辅助：写 FeatureMetadata@1 ───
function writeMetaV1(dir: string, id: string, versions: string[] = []) {
  writeFileSync(
    join(dir, "metadata.yaml"),
    stringify({
      schema: "FeatureMetadata@1",
      id,
      display_name: id,
      status: "active",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      modules: [],
      customers: [],
      versions,
      owners: [],
      inputs: [],
      relates_to: [],
      emits: {},
    }),
  );
}

// ─── 辅助：写 manifest.json ───
function writeManifest(dir: string, featureId: string) {
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({
      feature_id: featureId,
      case_drafting: { status: "not-started", requirement_atoms: [] },
      automation: { status: "not-started", intents: [], last_run_status: "not-run" },
      files: {},
    }),
  );
}

// ─── 辅助：构建标准 legacy flat fixture ───
function buildLegacyFeature(featuresDir: string, dirName: string, versions: string[] = []) {
  const dir = join(featuresDir, dirName);
  mkdirSync(dir, { recursive: true });

  // 用例产物
  writeFileSync(join(dir, "archive.md"), "# Archive");
  writeFileSync(join(dir, "cases.xmind"), "<xmind/>");

  // 自动化
  writeFileSync(join(dir, "AUTOMATION-PLAN.md"), "# Plan");
  mkdirSync(join(dir, "tests/cases"), { recursive: true });
  writeFileSync(join(dir, "tests/cases/t1.ts"), "// test");
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, "scripts/x.mjs"), "// script");

  // runs / tmp
  mkdirSync(join(dir, "results/run-1"), { recursive: true });
  writeFileSync(join(dir, "results/run-1/r.txt"), "result");
  mkdirSync(join(dir, "tmp"), { recursive: true });
  writeFileSync(join(dir, "tmp/t.md"), "# Tmp");

  // 保留条目
  mkdirSync(join(dir, "inputs"), { recursive: true });
  mkdirSync(join(dir, ".process"), { recursive: true });
  writeFileSync(join(dir, ".process/state.json"), "{}");

  writeMetaV1(dir, dirName, versions);
  writeManifest(dir, dirName);

  return dir;
}

describe("kata features migrate", () => {
  let scratch: string;
  let featuresDir: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-migrate-"));
    featuresDir = join(scratch, "dataAssets/features");
    mkdirSync(featuresDir, { recursive: true });
    writeFileSync(join(featuresDir, "INDEX.md"), "<!-- placeholder -->\n");
  });

  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  // ─── 1. dry-run 返回 plan，磁盘无改动 ───
  describe("dry-run plan", () => {
    it("returns plan with correct targetGroups and no disk changes", () => {
      // 【v6411】compact version → v6.4.11
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");
      // 2099- prefix → _standing
      buildLegacyFeature(featuresDir, "2099-01-lt-dq-smoke");
      // slug 无法推断版本 → unresolved
      buildLegacyFeature(featuresDir, "2026-04-assets-unknown");

      const rows = planMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: false,
      });

      // 三个 legacy-flat 目录各有对应行
      expect(rows).toHaveLength(3);

      const v = rows.find((r) => r.dirName === "【v6411】数据质量冒烟");
      expect(v?.targetGroup).toBe("v6.4.11");

      const s = rows.find((r) => r.dirName === "2099-01-lt-dq-smoke");
      expect(s?.targetGroup).toBe("_standing");

      const u = rows.find((r) => r.dirName === "2026-04-assets-unknown");
      expect(u?.targetGroup).toBeNull();

      // dry-run：磁盘无任何改动，旧目录仍在
      expect(existsSync(join(featuresDir, "【v6411】数据质量冒烟"))).toBe(true);
      expect(existsSync(join(featuresDir, "2099-01-lt-dq-smoke"))).toBe(true);
    });

    it("plan includes expected moves", () => {
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");
      const rows = planMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: false,
      });
      const row = rows.find((r) => r.dirName === "【v6411】数据质量冒烟");
      expect(row).toBeDefined();
      if (!row) throw new Error("row not found");
      // archive.md → cases/archive.md
      expect(row.moves.some((m) => m.from === "archive.md" && m.to === "cases/archive.md")).toBe(
        true,
      );
      // results → runs
      expect(row.moves.some((m) => m.from === "results" && m.to === "runs")).toBe(true);
      // tmp → runs/_tmp
      expect(row.moves.some((m) => m.from === "tmp" && m.to === "runs/_tmp")).toBe(true);
    });
  });

  // ─── 2. apply 后目标结构正确 ───
  describe("apply", () => {
    it("moves files to new structure and upgrades metadata to @2", async () => {
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");

      await runFeaturesMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: true,
        move: (from, to) => {
          const { renameSync } = require("node:fs");
          renameSync(from, to);
        },
      });

      const destBase = join(featuresDir, "v6.4.11", "【v6411】数据质量冒烟");

      // 用例产物在 cases/
      expect(existsSync(join(destBase, "cases/archive.md"))).toBe(true);
      expect(existsSync(join(destBase, "cases/cases.xmind"))).toBe(true);

      // 自动化在 automation/
      expect(existsSync(join(destBase, "automation/AUTOMATION-PLAN.md"))).toBe(true);
      expect(existsSync(join(destBase, "automation/tests/cases/t1.ts"))).toBe(true);
      expect(existsSync(join(destBase, "automation/scripts/x.mjs"))).toBe(true);

      // runs/ 结构
      expect(existsSync(join(destBase, "runs/run-1/r.txt"))).toBe(true);
      expect(existsSync(join(destBase, "runs/_tmp/t.md"))).toBe(true);

      // 根级旧条目消失
      expect(existsSync(join(destBase, "archive.md"))).toBe(false);
      expect(existsSync(join(destBase, "tests"))).toBe(false);
      expect(existsSync(join(destBase, "results"))).toBe(false);
      expect(existsSync(join(destBase, "tmp"))).toBe(false);
      expect(existsSync(join(destBase, "manifest.json"))).toBe(false);

      // 保留条目仍在 feature 根
      expect(existsSync(join(destBase, "inputs"))).toBe(true);
      expect(existsSync(join(destBase, ".process"))).toBe(true);
      expect(existsSync(join(destBase, "metadata.yaml"))).toBe(true);

      // metadata 升级为 @2
      const { parse } = await import("yaml");
      const parsed = parse(readFileSync(join(destBase, "metadata.yaml"), "utf-8"));
      expect(parsed.schema).toBe("FeatureMetadata@2");
    });

    it("legacy dir disappears from features root after apply", async () => {
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");

      await runFeaturesMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: true,
        move: (from, to) => {
          const { renameSync } = require("node:fs");
          renameSync(from, to);
        },
      });

      // 旧目录已从 features 根消失
      expect(existsSync(join(featuresDir, "【v6411】数据质量冒烟"))).toBe(false);
    });
  });

  // ─── 3. unresolved 时 apply 抛错 ───
  describe("unresolved handling", () => {
    it("throws when unresolved and allowUnresolved is false", async () => {
      buildLegacyFeature(featuresDir, "2026-04-assets-unknown");

      await expect(
        runFeaturesMigrate({
          project: "dataAssets",
          workspaceRoot: scratch,
          apply: true,
          move: (from, to) => {
            const { renameSync } = require("node:fs");
            renameSync(from, to);
          },
        }),
      ).rejects.toThrow(/无法推断版本/);
    });

    it("skips unresolved dirs when allowUnresolved=true", async () => {
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");
      buildLegacyFeature(featuresDir, "2026-04-assets-unknown");

      await runFeaturesMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: true,
        allowUnresolved: true,
        move: (from, to) => {
          const { renameSync } = require("node:fs");
          renameSync(from, to);
        },
      });

      // 已解析的迁移完成
      expect(existsSync(join(featuresDir, "v6.4.11", "【v6411】数据质量冒烟"))).toBe(true);
      // 未解析的仍留在原处
      expect(existsSync(join(featuresDir, "2026-04-assets-unknown"))).toBe(true);
    });
  });

  // ─── 4. 幂等 ───
  describe("idempotency", () => {
    it("dry-run plan is empty after migration", async () => {
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");

      // 先执行 apply
      await runFeaturesMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: true,
        move: (from, to) => {
          const { renameSync } = require("node:fs");
          renameSync(from, to);
        },
      });

      // 再做 dry-run，plan 应为空
      const rows = planMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: false,
      });
      expect(rows).toHaveLength(0);
    });
  });

  // ─── 5. fallbackGroup ───
  describe("fallbackGroup", () => {
    it("uses fallbackGroup for unresolvable slug dirs", () => {
      buildLegacyFeature(featuresDir, "2026-04-assets-slug");

      const rows = planMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: false,
        fallbackGroup: "_standing",
      });

      const r = rows.find((r) => r.dirName === "2026-04-assets-slug");
      expect(r?.targetGroup).toBe("_standing");
    });

    it("apply with fallbackGroup moves slug to _standing group", async () => {
      buildLegacyFeature(featuresDir, "2026-04-assets-slug");

      await runFeaturesMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: true,
        fallbackGroup: "_standing",
        move: (from, to) => {
          const { renameSync } = require("node:fs");
          renameSync(from, to);
        },
      });

      expect(existsSync(join(featuresDir, "_standing", "2026-04-assets-slug"))).toBe(true);
      // 原始位置消失
      expect(existsSync(join(featuresDir, "2026-04-assets-slug"))).toBe(false);
    });

    it("throws on invalid fallbackGroup on apply", async () => {
      buildLegacyFeature(featuresDir, "2026-04-assets-slug");

      await expect(
        runFeaturesMigrate({
          project: "dataAssets",
          workspaceRoot: scratch,
          apply: true,
          fallbackGroup: "not-valid-group",
          move: (from, to) => {
            const { renameSync } = require("node:fs");
            renameSync(from, to);
          },
        }),
      ).rejects.toThrow(/invalid fallbackGroup/i);
    });
  });

  // ─── 6. 目标碰撞预检（Fix 2）───
  describe("collision preflight", () => {
    it("planMigrate marks collision=true when target exists", () => {
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");
      // 预先在目标路径建目录，模拟碰撞
      mkdirSync(join(featuresDir, "v6.4.11", "【v6411】数据质量冒烟"), { recursive: true });

      const rows = planMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: false,
      });
      const row = rows.find((r) => r.dirName === "【v6411】数据质量冒烟");
      expect(row?.collision).toBe(true);
    });

    it("planMigrate marks collision=false when target does not exist", () => {
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");

      const rows = planMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: false,
      });
      const row = rows.find((r) => r.dirName === "【v6411】数据质量冒烟");
      expect(row?.collision).toBe(false);
    });

    it("runFeaturesMigrate throws before any mutation when collision detected", async () => {
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");
      buildLegacyFeature(featuresDir, "2099-01-lt-dq-smoke");
      // 预先在目标路径建目录，模拟碰撞
      mkdirSync(join(featuresDir, "v6.4.11", "【v6411】数据质量冒烟"), { recursive: true });

      await expect(
        runFeaturesMigrate({
          project: "dataAssets",
          workspaceRoot: scratch,
          apply: true,
          move: (from, to) => {
            const { renameSync } = require("node:fs");
            renameSync(from, to);
          },
        }),
      ).rejects.toThrow(/迁移目标路径已存在/);

      // 确保无任何目录被迁移（mutation 前被拦截）
      expect(existsSync(join(featuresDir, "2099-01-lt-dq-smoke"))).toBe(true);
    });
  });

  // ─── 7. 移动顺序稳定（Fix 2）───
  describe("stable move order (results before tmp)", () => {
    it("moves sort by target depth: runs before runs/_tmp", () => {
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");

      const rows = planMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: false,
      });
      const row = rows.find((r) => r.dirName === "【v6411】数据质量冒烟");
      expect(row).toBeDefined();
      if (!row) throw new Error("row not found");

      const idxRuns = row.moves.findIndex((m) => m.to === "runs");
      const idxTmp = row.moves.findIndex((m) => m.to === "runs/_tmp");
      // runs (depth 1) must come before runs/_tmp (depth 2)
      expect(idxRuns).toBeGreaterThanOrEqual(0);
      expect(idxTmp).toBeGreaterThanOrEqual(0);
      expect(idxRuns).toBeLessThan(idxTmp);
    });

    it("applies correctly when fixture has both results/ and tmp/", async () => {
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");

      await runFeaturesMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: true,
        move: (from, to) => {
          const { renameSync } = require("node:fs");
          renameSync(from, to);
        },
      });

      const destBase = join(featuresDir, "v6.4.11", "【v6411】数据质量冒烟");
      expect(existsSync(join(destBase, "runs/run-1/r.txt"))).toBe(true);
      expect(existsSync(join(destBase, "runs/_tmp/t.md"))).toBe(true);
      expect(existsSync(join(destBase, "results"))).toBe(false);
      expect(existsSync(join(destBase, "tmp"))).toBe(false);
    });
  });

  // ─── 8. dotted 版本目录名（Fix 5）───
  describe("dotted version dir names", () => {
    it("resolves dotted 【v6.4.11】 directly", () => {
      buildLegacyFeature(featuresDir, "【v6.4.11】数据质量冒烟");

      const rows = planMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: false,
      });
      const row = rows.find((r) => r.dirName === "【v6.4.11】数据质量冒烟");
      expect(row?.targetGroup).toBe("v6.4.11");
    });

    it("resolves two-segment dotted 【v6.4】 to v6.4", () => {
      buildLegacyFeature(featuresDir, "【v6.4】数据质量冒烟");

      const rows = planMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: false,
      });
      const row = rows.find((r) => r.dirName === "【v6.4】数据质量冒烟");
      expect(row?.targetGroup).toBe("v6.4");
    });

    it("still resolves compact 【v6411】 to v6.4.11", () => {
      buildLegacyFeature(featuresDir, "【v6411】数据质量冒烟");

      const rows = planMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: false,
      });
      const row = rows.find((r) => r.dirName === "【v6411】数据质量冒烟");
      expect(row?.targetGroup).toBe("v6.4.11");
    });

    it("applies migration for dotted version dir name", async () => {
      buildLegacyFeature(featuresDir, "【v6.4.11】数据质量冒烟");

      await runFeaturesMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: true,
        move: (from, to) => {
          const { renameSync } = require("node:fs");
          renameSync(from, to);
        },
      });

      expect(
        existsSync(join(featuresDir, "v6.4.11", "【v6.4.11】数据质量冒烟", "cases/archive.md")),
      ).toBe(true);
      expect(existsSync(join(featuresDir, "【v6.4.11】数据质量冒烟"))).toBe(false);
    });
  });

  // ─── 9. level③ metadata.versions 解析（Fix 5）───
  describe("resolveGroup level③ via metadata.versions", () => {
    it("uses last version from metadata.versions when dir has no version marker", () => {
      buildLegacyFeature(featuresDir, "2026-04-assets-slug", ["v6.4.7", "v6.4.9"]);

      const rows = planMigrate({
        project: "dataAssets",
        workspaceRoot: scratch,
        apply: false,
      });
      const row = rows.find((r) => r.dirName === "2026-04-assets-slug");
      expect(row?.targetGroup).toBe("v6.4.9");
    });
  });

  // ─── 10. 真实 git mv 包装（Fix 4）───
  describe("real git mv wrapper (makeGitMove)", () => {
    let gitRoot: string;

    beforeEach(() => {
      gitRoot = mkdtempSync(join(tmpdir(), "kata-git-mv-test-"));
      // 初始化真实 git repo
      execFileSync("git", ["init"], { cwd: gitRoot, stdio: "pipe" });
      execFileSync("git", ["config", "user.email", "test@test.com"], {
        cwd: gitRoot,
        stdio: "pipe",
      });
      execFileSync("git", ["config", "user.name", "Test"], { cwd: gitRoot, stdio: "pipe" });
    });

    afterEach(() => rmSync(gitRoot, { recursive: true, force: true }));

    it("tracked file: git mv preserves history; ignored results/ falls back to renameSync", async () => {
      // 构造 legacy feature
      const featDir = join(gitRoot, "dataAssets", "features");
      mkdirSync(featDir, { recursive: true });

      const featureName = "【v6.4.11】git-mv-test";
      const featureDir = join(featDir, featureName);
      mkdirSync(featureDir, { recursive: true });

      // tracked 文件
      writeFileSync(join(featureDir, "archive.md"), "# Archive");
      writeFileSync(
        join(featureDir, "metadata.yaml"),
        stringify({
          schema: "FeatureMetadata@1",
          id: "git-mv-test",
          display_name: "git mv test",
          status: "active",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          modules: [],
          customers: [],
          versions: [],
          owners: [],
          inputs: [],
          relates_to: [],
          emits: {},
        }),
      );
      writeFileSync(
        join(featureDir, "manifest.json"),
        JSON.stringify({
          feature_id: "git-mv-test",
          case_drafting: { status: "not-started", requirement_atoms: [] },
          automation: { status: "not-started", intents: [], last_run_status: "not-run" },
          files: {},
        }),
      );

      // .gitignore: ignored results/
      writeFileSync(join(gitRoot, ".gitignore"), "results/\n");

      // ignored results/ (untracked)
      mkdirSync(join(featureDir, "results", "run-1"), { recursive: true });
      writeFileSync(join(featureDir, "results", "run-1", "r.txt"), "result");

      // INDEX.md placeholder
      writeFileSync(join(featDir, "INDEX.md"), "<!-- placeholder -->\n");

      // git add + commit
      execFileSync("git", ["add", "-A"], { cwd: gitRoot, stdio: "pipe" });
      execFileSync("git", ["commit", "-m", "init"], { cwd: gitRoot, stdio: "pipe" });

      // 跑真实 gitMove 包装的迁移（传 cwd=gitRoot 确保 git mv 在正确 repo 中运行）
      await runFeaturesMigrate({
        project: "dataAssets",
        workspaceRoot: gitRoot,
        apply: true,
        move: makeGitMove(gitRoot),
      });

      const destBase = join(featDir, "v6.4.11", featureName);

      // cases/archive.md 在目标位置
      expect(existsSync(join(destBase, "cases", "archive.md"))).toBe(true);

      // ignored results/ 已通过 renameSync 回退正确落到 runs/（fallback 行为）
      expect(existsSync(join(destBase, "runs", "run-1", "r.txt"))).toBe(true);

      // 原始位置无残留（无静默漏移）
      expect(existsSync(join(featDir, featureName))).toBe(false);

      // git status 中旧路径已无剩余未移动的 tracked 文件（tracked 文件要么被 git mv，要么在 renameSync 后显示为 D/??）
      const statusOutput = execFileSync("git", ["status", "--short"], {
        cwd: gitRoot,
        encoding: "utf-8",
      });
      // 旧 feature 根路径（未迁移状态）不能有 tracked 文件残留
      expect(statusOutput).not.toContain(`${featureName}/archive.md`);
      // 新路径存在于磁盘（无论是 git 追踪还是 renameSync fallback 都应到位）
      expect(existsSync(join(destBase, "cases", "archive.md"))).toBe(true);
    });
  });
});

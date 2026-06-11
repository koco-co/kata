import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  // ─── git 一致性回归：迁移在真实 git repo 内不得留 husk / 重复 / RD 孤儿 ───
  // 该用例复刻历史 husk bug 的真实场景：feature 同时含 tracked 用例产物、tracked
  // 自动化、ignored results/ 与 tmp/，且 merge 会先删 manifest.json。过去命令注入
  // git mv：git mv 只搬 tracked 文件，预删 manifest 又让整目录 git mv 失败、回退
  // renameSync，留下 flat husk + 版本层重复副本 + git index 指向旧 flat 路径的 RD 孤儿。
  // 现在迁移用默认 renameSync 一次性搬整目录，命令层再 git add -A 对齐 index。
  describe("git-consistent migration (husk regression)", () => {
    let gitRoot: string;
    let gitFeaturesDir: string;

    beforeEach(() => {
      gitRoot = mkdtempSync(join(tmpdir(), "kata-migrate-git-"));
      execFileSync("git", ["init"], { cwd: gitRoot, stdio: "pipe" });
      execFileSync("git", ["config", "user.email", "test@test.com"], {
        cwd: gitRoot,
        stdio: "pipe",
      });
      execFileSync("git", ["config", "user.name", "Test"], { cwd: gitRoot, stdio: "pipe" });
      gitFeaturesDir = join(gitRoot, "dataAssets", "features");
      mkdirSync(gitFeaturesDir, { recursive: true });
      writeFileSync(join(gitFeaturesDir, "INDEX.md"), "<!-- placeholder -->\n");
      // results/、tmp/、runs/ 均为 ignored runtime 目录（与真实项目一致）。
      // git mv 搬不动 ignored 文件，只有整目录 renameSync 才能把它们带到版本层。
      writeFileSync(join(gitRoot, ".gitignore"), "**/results/\n**/tmp/\n**/runs/\n");
    });

    afterEach(() => rmSync(gitRoot, { recursive: true, force: true }));

    // 以命令真实路径执行：默认 renameSync 迁移 + git add -A 暂存
    async function migrateAndStage(): Promise<void> {
      await runFeaturesMigrate({ project: "dataAssets", workspaceRoot: gitRoot, apply: true });
      execFileSync("git", ["add", "-A", gitFeaturesDir], { cwd: gitRoot, stdio: "pipe" });
    }

    it("leaves no husk, no duplicate, and a git-consistent staged tree", async () => {
      const featureName = "【v6.4.11】husk-regression";
      const flatDir = buildLegacyFeature(gitFeaturesDir, featureName, []);
      // 写入差异化多行内容，让步骤⑥的 rename 检测有真实信号，而非小相同 blob 巧合命中
      writeFileSync(
        join(flatDir, "cases.xmind"),
        "<xmind>\n  <sheet>husk-regression distinct payload line 1</sheet>\n  <sheet>line 2</sheet>\n</xmind>\n",
      );
      execFileSync("git", ["add", "-A"], { cwd: gitRoot, stdio: "pipe" });
      execFileSync("git", ["commit", "-m", "init"], { cwd: gitRoot, stdio: "pipe" });

      await migrateAndStage();

      const destBase = join(gitFeaturesDir, "v6.4.11", featureName);

      // ① 无 flat husk：旧 feature 根目录必须整体消失，不留任何残壳
      expect(existsSync(flatDir)).toBe(false);

      // ② 目标三区完整，含 ignored 文件（results→runs、tmp→runs/_tmp）也被整目录搬过去
      expect(existsSync(join(destBase, "cases", "archive.md"))).toBe(true);
      expect(existsSync(join(destBase, "cases", "cases.xmind"))).toBe(true);
      expect(existsSync(join(destBase, "automation", "AUTOMATION-PLAN.md"))).toBe(true);
      expect(existsSync(join(destBase, "automation", "tests", "cases", "t1.ts"))).toBe(true);
      expect(existsSync(join(destBase, "runs", "run-1", "r.txt"))).toBe(true);
      expect(existsSync(join(destBase, "runs", "_tmp", "t.md"))).toBe(true);
      // metadata 升级到 @2，manifest 已删
      expect(existsSync(join(destBase, "metadata.yaml"))).toBe(true);
      expect(existsSync(join(destBase, "manifest.json"))).toBe(false);
      expect(readFileSync(join(destBase, "metadata.yaml"), "utf-8")).toContain("case_drafting");

      // ③ git index 一致：git add -A 后无 untracked(??)、无 RD 孤儿
      const status = execFileSync("git", ["status", "--porcelain"], {
        cwd: gitRoot,
        encoding: "utf-8",
      });
      for (const line of status.split("\n").filter(Boolean)) {
        const xy = line.slice(0, 2);
        expect(xy).not.toBe("??"); // 不得有未暂存的新副本
        expect(xy).not.toBe("RD"); // 不得有「index 指向已不存在工作树路径」的孤儿
      }

      // ④ tracked 索引里旧 flat 路径彻底消失，只存在于版本层（无重复/husk 残留）
      // core.quotePath=false：让 git 原样输出 UTF-8 路径，不做 octal 转义
      const tracked = execFileSync("git", ["-c", "core.quotePath=false", "ls-files"], {
        cwd: gitRoot,
        encoding: "utf-8",
      });
      const flatRel = `dataAssets/features/${featureName}/`;
      const destRel = `dataAssets/features/v6.4.11/${featureName}/`;
      for (const f of tracked.split("\n").filter(Boolean)) {
        expect(f.startsWith(flatRel)).toBe(false);
      }
      expect(tracked).toContain(`${destRel}cases/archive.md`);

      // ⑤ 提交后工作树彻底干净（无悬挂改动）
      execFileSync("git", ["commit", "-m", "migrate"], { cwd: gitRoot, stdio: "pipe" });
      const afterCommit = execFileSync("git", ["status", "--porcelain"], {
        cwd: gitRoot,
        encoding: "utf-8",
      });
      expect(afterCommit.trim()).toBe("");

      // ⑥ 内容未变的用例产物移动后历史可追溯（git 在提交时做 rename 检测）
      const log = execFileSync(
        "git",
        ["log", "--follow", "--format=%s", "--", `${destRel}cases/cases.xmind`],
        { cwd: gitRoot, encoding: "utf-8" },
      );
      expect(log).toContain("init");
    });

    it("migrates multiple features to different groups with a consistent index", async () => {
      // 两个 feature 同仓库一起迁移：一个进版本层、一个进 _standing，
      // 验证多 feature 下 git index 仍无 RD 孤儿、无旧 flat 路径残留。
      const versioned = "【v6.4.11】multi-versioned";
      const standing = "2099-01-lt-dq-smoke";
      const flatVersioned = buildLegacyFeature(gitFeaturesDir, versioned, []);
      const flatStanding = buildLegacyFeature(gitFeaturesDir, standing, []);
      execFileSync("git", ["add", "-A"], { cwd: gitRoot, stdio: "pipe" });
      execFileSync("git", ["commit", "-m", "init"], { cwd: gitRoot, stdio: "pipe" });

      await migrateAndStage();

      // 两个 flat husk 都消失，目标各就各位
      expect(existsSync(flatVersioned)).toBe(false);
      expect(existsSync(flatStanding)).toBe(false);
      expect(existsSync(join(gitFeaturesDir, "v6.4.11", versioned, "cases", "archive.md"))).toBe(
        true,
      );
      expect(existsSync(join(gitFeaturesDir, "_standing", standing, "cases", "archive.md"))).toBe(
        true,
      );

      // git index 全树一致：无 ?? / 无 RD
      const status = execFileSync("git", ["status", "--porcelain"], {
        cwd: gitRoot,
        encoding: "utf-8",
      });
      for (const line of status.split("\n").filter(Boolean)) {
        const xy = line.slice(0, 2);
        expect(xy).not.toBe("??");
        expect(xy).not.toBe("RD");
      }

      // tracked 索引里两个旧 flat 路径都彻底消失
      const tracked = execFileSync("git", ["-c", "core.quotePath=false", "ls-files"], {
        cwd: gitRoot,
        encoding: "utf-8",
      });
      for (const f of tracked.split("\n").filter(Boolean)) {
        expect(f.startsWith(`dataAssets/features/${versioned}/`)).toBe(false);
        expect(f.startsWith(`dataAssets/features/${standing}/`)).toBe(false);
      }

      // 提交后工作树干净
      execFileSync("git", ["commit", "-m", "migrate"], { cwd: gitRoot, stdio: "pipe" });
      const afterCommit = execFileSync("git", ["status", "--porcelain"], {
        cwd: gitRoot,
        encoding: "utf-8",
      });
      expect(afterCommit.trim()).toBe("");
    });
  });
});
